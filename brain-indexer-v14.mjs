#!/usr/bin/env node
/**
 * brain-indexer-v14.mjs
 * Axiom Tide — CONK v14 Brain Indexer
 *
 * Polls for CastReferenced events from the v14 package and writes
 * synapse edges to a local SQLite brain DB at ~/.conk/brain.db.
 *
 * Runs once and exits — driven by cron (15 * * * *).
 */

import { SuiClient } from '@mysten/sui/client'
import { createRequire } from 'module'
import { homedir } from 'os'
import { mkdirSync } from 'fs'
import { join } from 'path'

const require = createRequire(import.meta.url)

// ─── Config ──────────────────────────────────────────────────────────────────

const CONK_PACKAGE  = process.env.CONK_PACKAGE  || '0x265ec216d95c6109f92d90e310da4cfb0c123efa1c00540d8ced4e0d37392297'
const SUI_RPC_URL   = process.env.SUI_RPC_URL   || 'https://sui-mainnet.gateway.tatum.io'
const TATUM_API_KEY = process.env.TATUM_API_KEY || ''

const DB_DIR  = join(homedir(), '.conk')
const DB_PATH = join(DB_DIR, 'brain.db')

const EVENT_TYPE = `${CONK_PACKAGE}::cast::CastReferenced`

// ─── DB setup ────────────────────────────────────────────────────────────────

function openDb() {
  mkdirSync(DB_DIR, { recursive: true })
  const Database = require('better-sqlite3')
  const db = new Database(DB_PATH)

  db.exec(`
    CREATE TABLE IF NOT EXISTS edges (
      from_cast  TEXT NOT NULL,
      to_cast    TEXT NOT NULL,
      weight     REAL NOT NULL DEFAULT 2.0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (from_cast, to_cast)
    );

    CREATE TABLE IF NOT EXISTS cursor (
      event_type TEXT PRIMARY KEY,
      cursor     TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stats (
      cast_id    TEXT PRIMARY KEY,
      in_degree  INTEGER NOT NULL DEFAULT 0,
      out_degree INTEGER NOT NULL DEFAULT 0
    );
  `)

  return db
}

// ─── Sui client ───────────────────────────────────────────────────────────────

function buildClient() {
  const headers = TATUM_API_KEY ? { 'x-api-key': TATUM_API_KEY } : {}
  return new SuiClient({ url: SUI_RPC_URL, rpcConfig: { headers } })
}

// ─── Ingestion logic ─────────────────────────────────────────────────────────

/**
 * Upsert edges for a CastReferenced event (idempotent overwrite).
 * - Removes stale edges FROM cast_id that are no longer in references.
 * - Upserts new/updated edges.
 * - Recalculates in/out degrees for all affected casts.
 */
function ingestEvent(db, castId, references, updatedAt) {
  const nowMs = updatedAt || Date.now()

  // Fetch current references for this cast
  const existingRefs = db
    .prepare(`SELECT to_cast FROM edges WHERE from_cast = ?`)
    .all(castId)
    .map(r => r.to_cast)

  const refSet     = new Set(references)
  const existingSet = new Set(existingRefs)

  // Remove stale edges
  const toRemove = existingRefs.filter(r => !refSet.has(r))
  if (toRemove.length > 0) {
    const placeholders = toRemove.map(() => '?').join(',')
    db.prepare(`DELETE FROM edges WHERE from_cast = ? AND to_cast IN (${placeholders})`)
      .run(castId, ...toRemove)
    console.log(`[indexer]   Removed ${toRemove.length} stale edge(s) from ${castId}`)
  }

  // Upsert new/updated edges
  const upsert = db.prepare(`
    INSERT INTO edges (from_cast, to_cast, weight, created_at, updated_at)
    VALUES (?, ?, 2.0, ?, ?)
    ON CONFLICT (from_cast, to_cast) DO UPDATE SET
      weight     = 2.0,
      updated_at = excluded.updated_at
  `)

  for (const ref of references) {
    upsert.run(castId, ref, nowMs, nowMs)
  }

  // Rebuild out_degree for castId
  const outDegree = references.length
  db.prepare(`
    INSERT INTO stats (cast_id, in_degree, out_degree)
    VALUES (?, 0, ?)
    ON CONFLICT (cast_id) DO UPDATE SET out_degree = excluded.out_degree
  `).run(castId, outDegree)

  // Recalculate in_degree for all affected casts (new + removed targets)
  const affectedTargets = new Set([...references, ...toRemove])
  for (const target of affectedTargets) {
    const inDeg = db
      .prepare(`SELECT COUNT(*) as cnt FROM edges WHERE to_cast = ?`)
      .get(target).cnt
    db.prepare(`
      INSERT INTO stats (cast_id, in_degree, out_degree)
      VALUES (?, ?, 0)
      ON CONFLICT (cast_id) DO UPDATE SET in_degree = excluded.in_degree
    `).run(target, inDeg)
  }
}

// ─── Cursor persistence ───────────────────────────────────────────────────────

function loadCursor(db) {
  const row = db
    .prepare(`SELECT cursor FROM cursor WHERE event_type = ?`)
    .get(EVENT_TYPE)
  return row?.cursor ?? null
}

function saveCursor(db, cursorValue) {
  db.prepare(`
    INSERT INTO cursor (event_type, cursor)
    VALUES (?, ?)
    ON CONFLICT (event_type) DO UPDATE SET cursor = excluded.cursor
  `).run(EVENT_TYPE, cursorValue)
}

// ─── Poll loop ────────────────────────────────────────────────────────────────

async function poll(client, db) {
  let cursor = loadCursor(db)
  let totalIngested = 0
  let page = 0

  console.log(`[indexer] Starting poll for ${EVENT_TYPE}`)
  console.log(`[indexer] Resume cursor: ${cursor ?? '(none — full scan)'}`)

  while (true) {
    const result = await client.queryEvents({
      query:  { MoveEventType: EVENT_TYPE },
      cursor: cursor ? cursor : undefined,
      limit:  50,
      order:  'ascending',
    })

    for (const ev of result.data) {
      const fields = ev.parsedJson
      if (!fields) continue

      const castId     = fields.cast_id
      const refs       = fields.references ?? []
      const updatedAt  = Number(fields.updated_at ?? Date.now())

      console.log(`[indexer] CastReferenced: cast=${castId} refs=${refs.length}`)
      ingestEvent(db, castId, refs, updatedAt)
      totalIngested++
    }

    if (result.nextCursor) {
      cursor = result.nextCursor
      saveCursor(db, JSON.stringify(cursor))
    }

    page++
    if (!result.hasNextPage) break
  }

  console.log(`[indexer] Poll complete — ${totalIngested} event(s) ingested over ${page} page(s)`)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`[indexer] brain-indexer-v14 starting — ${new Date().toISOString()}`)
  console.log(`[indexer] Package: ${CONK_PACKAGE}`)
  console.log(`[indexer] DB: ${DB_PATH}`)

  const client = buildClient()
  const db     = openDb()

  await poll(client, db)

  db.close()
  console.log(`[indexer] Done. DB closed.`)
}

main().catch(e => {
  console.error('[indexer] Fatal:', e)
  process.exit(1)
})
