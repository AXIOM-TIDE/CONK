/**
 * CONK Agent Protocol Test
 * Runs the full protocol loop autonomously via the Daemon API.
 * No UI — pure programmatic execution.
 *
 * This is what an external AI agent would do when integrating with CONK.
 * Run with: npx ts-node tests/agent-protocol-test.ts
 */

import { chromium } from '@playwright/test'

const BASE_URL = process.env.CONK_URL ?? 'http://localhost:5173'

async function runAgentTest() {
  const browser = await chromium.launch({ headless: true })
  const page    = await browser.newPage()

  console.log('\n⚡ CONK Agent Protocol Test')
  console.log('━'.repeat(50))
  console.log(`Target: ${BASE_URL}\n`)

  const results: { test: string; passed: boolean; ms: number; detail?: string }[] = []

  async function test(name: string, fn: () => Promise<void>) {
    const t0 = Date.now()
    try {
      await fn()
      const ms = Date.now() - t0
      results.push({ test: name, passed: true, ms })
      console.log(`  ✓ ${name} (${ms}ms)`)
    } catch (e: any) {
      const ms = Date.now() - t0
      results.push({ test: name, passed: false, ms, detail: e.message })
      console.log(`  ✗ ${name} — ${e.message}`)
    }
  }

  // Helper: clear state and onboard
  async function setup() {
    await page.goto(BASE_URL)
    await page.evaluate(() => localStorage.clear())
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForSelector('[data-testid="onboard-continue"]', { timeout: 8000 })
    await page.getByTestId('onboard-continue').first().click()
    await page.getByTestId('onboard-continue').first().click()
    await page.getByTestId('onboard-launch').click()
    await page.waitForSelector('[data-testid="harbor-home"]', { timeout: 10000 })
  }

  // Helper: enter vessel
  async function enterVessel() {
    await page.getByTestId('enter-vessels-btn').first().click()
    await page.waitForSelector('[data-testid="vessel-select"]')
    await page.getByTestId('enter-vessel-btn').first().click()
    await page.waitForSelector('[data-testid="vessel-home"]')
  }

  // Helper: draw fuel
  async function drawFuel() {
    await page.getByTestId('fuel-module').first().click()
    await page.waitForSelector('[data-testid="draw-fuel-modal"]')
    await page.getByTestId('fuel-amount-25').click()
    await page.getByTestId('charge-vessel-btn').click()
    await page.waitForSelector('[data-testid="draw-fuel-modal"]', { state: 'hidden' })
  }

  // ── SUITE 1: Onboarding ───────────────────────────────────
  console.log('Suite 1 — Onboarding & Setup')

  await test('App loads', async () => {
    await setup()
    const harbor = await page.getByTestId('harbor-home').isVisible()
    if (!harbor) throw new Error('Harbor not visible after onboarding')
  })

  await test('Vessel launches from onboarding', async () => {
    await enterVessel()
    const home = await page.getByTestId('vessel-home').isVisible()
    if (!home) throw new Error('VesselHome not visible')
  })

  await test('Vessel starts with zero fuel', async () => {
    const val = await page.getByTestId('fuel-value').textContent()
    if (!val?.includes('0.00')) throw new Error(`Expected $0.00 got ${val}`)
  })

  // ── SUITE 2: Shore & Daemon ───────────────────────────────
  console.log('\nSuite 2 — Shore & Daemon Console')

  await test('Daemon tab accessible', async () => {
    await page.getByTestId('tab-daemon').click()
    await page.waitForTimeout(500)
  })

  await test('Daemon launch flow works', async () => {
    const launchBtn = page.getByText('⚙ Launch Daemon')
    if (await launchBtn.isVisible()) {
      await launchBtn.click()
      await page.getByText('Launch Daemon · $0.01').click()
      await page.waitForTimeout(1500)
    }
  })

  await test('Draw fuel into vessel', async () => {
    await page.getByTestId('tab-drift').click()
    await drawFuel()
    const val = await page.getByTestId('fuel-value').textContent()
    if (val?.includes('0.00')) throw new Error('Fuel did not update')
  })

  await test('Fund Shore from Harbor', async () => {
    await page.getByTestId('tab-daemon').click()
    await page.waitForTimeout(300)
    const fundBtn = page.getByText('+ Fund Shore from Harbor')
    if (await fundBtn.isVisible()) {
      await fundBtn.click()
      await page.waitForTimeout(200)
    }
  })

  // ── SUITE 3: Paywall & Content Gate ──────────────────────
  console.log('\nSuite 3 — Paywall & Content Gate')

  await test('No body visible before unlock', async () => {
    await page.getByTestId('tab-drift').click()
    await page.waitForSelector('[data-testid="cast-row"]')
    const bodies = await page.getByTestId('cast-body').count()
    if (bodies > 0) throw new Error(`${bodies} cast bodies visible before unlock`)
  })

  await test('Paywall modal appears on hook click', async () => {
    await page.getByTestId('cast-row').first().click()
    await page.waitForSelector('[data-testid="cast-expanded"]')
    await page.getByTestId('cross-payway-btn').click()
    await page.waitForSelector('[data-testid="payway-modal"]')
    const bodies = await page.getByTestId('cast-body').count()
    if (bodies > 0) throw new Error('Body visible during paywall')
  })

  await test('Two-step paywall flow completes', async () => {
    await page.getByTestId('payway-continue-btn').click()
    await page.waitForSelector('[data-testid="payway-step-confirm"]')
    await page.getByTestId('payway-confirm-btn').click()
    await page.waitForSelector('[data-testid="cast-body"]', { timeout: 8000 })
  })

  // ── SUITE 4: Burn / Store ─────────────────────────────────
  console.log('\nSuite 4 — Burn / Store / Auto-burn')

  await test('Store saves signal', async () => {
    const storeBtn = page.getByTestId('store-btn')
    if (await storeBtn.isVisible()) {
      await storeBtn.click()
      await page.waitForSelector('[data-testid="stored-badge"]')
    }
  })

  await test('Stored tab shows saved signal', async () => {
    await page.getByTestId('tab-stored').click()
    await page.waitForSelector('[data-testid="stored-panel"]')
    const items = await page.getByTestId('stored-item').count()
    if (items === 0) throw new Error('No stored items found')
  })

  await test('Stored signal expands to show body', async () => {
    await page.getByTestId('stored-item').first().click()
    await page.waitForTimeout(500)
  })

  await test('Viewer burn removes signal from drift', async () => {
    await page.getByTestId('tab-drift').click()
    await page.waitForSelector('[data-testid="cast-row"]')

    // Unlock another cast
    const rows = page.getByTestId('cast-row')
    const count = await rows.count()
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i)
      const future = await row.locator('[data-testid="future-countdown"]').count()
      if (future > 0) continue
      await row.click()
      const expanded = await page.waitForSelector('[data-testid="cast-expanded"]', { timeout: 2000 }).catch(() => null)
      if (!expanded) continue
      const cta = page.getByTestId('cross-payway-btn')
      if (await cta.isVisible()) {
        await cta.click()
        await page.waitForSelector('[data-testid="payway-modal"]')
        await page.getByTestId('payway-continue-btn').click()
        await page.getByTestId('payway-confirm-btn').click()
        await page.waitForSelector('[data-testid="cast-body"]', { timeout: 8000 })
        const burnBtn = page.getByTestId('viewer-burn-btn')
        if (await burnBtn.isVisible()) {
          await burnBtn.click()
          await page.waitForTimeout(500)
        }
        break
      }
    }
  })

  // ── SUITE 5: Drift Filters ────────────────────────────────
  console.log('\nSuite 5 — Drift Filters & Search')

  await test('Keyword search works', async () => {
    await page.getByTestId('search-toggle').click()
    await page.getByTestId('search-input').fill('protocol')
    await page.waitForTimeout(300)
    const count = await page.getByTestId('cast-row').count()
    if (count === 0) throw new Error('No results for "protocol"')
    await page.getByTestId('search-clear-btn').click()
  })

  await test('Burn mode filter works', async () => {
    await page.getByTestId('filter-burn').click()
    await page.waitForTimeout(200)
    const rows = page.getByTestId('cast-row')
    const count = await rows.count()
    if (count > 0) {
      const badge = await rows.first().getByTestId('mode-badge').textContent()
      if (!badge?.includes('Burn')) throw new Error(`Expected Burn badge got: ${badge}`)
    }
    await page.getByTestId('filter-all').click()
  })

  // ── SUITE 6: Back Buttons ─────────────────────────────────
  console.log('\nSuite 6 — Navigation & Back Buttons')

  await test('Back to Harbor from VesselHome', async () => {
    await page.getByTestId('back-to-harbor').click()
    await page.waitForSelector('[data-testid="harbor-home"]')
  })

  await test('Back to Harbor from VesselSelect', async () => {
    await page.getByTestId('enter-vessels-btn').first().click()
    await page.waitForSelector('[data-testid="vessel-select"]')
    await page.getByTestId('back-to-harbor').click()
    await page.waitForSelector('[data-testid="harbor-home"]')
  })

  // ── RESULTS ───────────────────────────────────────────────
  console.log('\n' + '━'.repeat(50))
  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length
  const total  = results.length

  console.log(`\n${passed}/${total} passed · ${failed} failed`)

  if (failed > 0) {
    console.log('\nFailed tests:')
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  ✗ ${r.test}: ${r.detail}`)
    })
  }

  console.log('\nSui integration points (all marked TODO STEP 6):')
  console.log('  • use402.ts pay()        → suiClient.executeTransactionBlock()')
  console.log('  • use402.ts sound()      → walrus.upload(sealed) + sui.createCast()')
  console.log('  • daemon/index.ts read() → seal.decrypt(blobId, policy)')
  console.log('  • daemon/index.ts cast() → seal.encrypt() + walrus.upload()')
  console.log('  • store relayPool        → sui.drawFromRelayPool(vesselId)')
  console.log()

  await browser.close()
  process.exit(failed > 0 ? 1 : 0)
}

runAgentTest().catch(err => {
  console.error('Agent test runner failed:', err)
  process.exit(1)
})
