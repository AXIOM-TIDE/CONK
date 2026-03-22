/**
 * CONK Gateway — Type Definitions
 * Every message entering the daemon passes through here first.
 * Content informs. Policy executes. Your agent cannot be hijacked.
 */

// ── MESSAGE TYPES ─────────────────────────────────────────────
// Every input to the daemon is classified as one of these.
// Only 'instruction' type can trigger policy-gated actions.

export type MessageType =
  | 'instruction'     // from human owner — trusted, can trigger actions
  | 'signal'          // from Drift/Cast — untrusted, inform only
  | 'payment'         // Shore funded or received
  | 'task_complete'   // agent finished work
  | 'siren'           // job request from network
  | 'dock_request'    // invitation to information port
  | 'alert'           // anomaly detected — high priority
  | 'heartbeat'       // daemon wake cycle
  | 'bounty'          // signal bounty posted
  | 'coalition'       // coalition coordination message
  | 'system'          // internal protocol event

// ── TRUST LEVELS ─────────────────────────────────────────────
export type TrustLevel =
  | 'owner'       // Harbor owner — full trust
  | 'coalition'   // allied vessel — partial trust
  | 'network'     // unknown vessel — untrusted
  | 'system'      // protocol itself — verified

// ── RISK LEVELS ──────────────────────────────────────────────
export type RiskLevel =
  | 'safe'        // no red flags
  | 'low'         // minor concern
  | 'medium'      // review recommended
  | 'high'        // block and flag
  | 'critical'    // immediate block, alert human

// ── GATEWAY MESSAGE ───────────────────────────────────────────
// Every message entering the system gets this shape after classification
export interface GatewayMessage {
  id:           string
  receivedAt:   number
  source:       string        // vesselId or 'system' or 'owner'
  type:         MessageType
  trust:        TrustLevel
  risk:         RiskLevel
  content:      string        // raw content — NEVER executed directly
  metadata:     Record<string, unknown>
  flags:        string[]      // reasons for elevated risk
  allowed:      boolean       // gateway decision: allow or block
  requiresApproval: boolean   // needs human review before daemon acts
}

// ── INBOX EVENT ───────────────────────────────────────────────
// What the daemon actually receives after gateway processing
export interface InboxEvent {
  id:         string
  type:       MessageType
  trust:      TrustLevel
  content:    string
  metadata:   Record<string, unknown>
  timestamp:  number
  processed:  boolean
  action?:    string    // what the daemon decided to do
}

// ── VELOCITY RECORD ───────────────────────────────────────────
// Tracks actions per vessel per tide for rate limiting
export interface VelocityRecord {
  vesselId:     string
  tideStart:    number      // start of current 24h tide
  castCount:    number      // casts this tide
  readCount:    number      // reads this tide
  sirenCount:   number      // siren responses this tide
  dockCount:    number      // dock entries this tide
  flagCount:    number      // times flagged this tide
}

// ── POLICY ────────────────────────────────────────────────────
export interface DaemonPolicy {
  maxCastsPerTide:      number    // default 50
  maxReadsPerTide:      number    // default 500
  maxSirenResponsesPerTide: number // default 20
  maxDockEntriesPerTide:   number  // default 10
  autoApproveThreshold:    number  // cents — default 10 ($0.10)
  allowedMessageTypes:     MessageType[]
  blockedKeywords:         string[]
  requireApprovalAbove:    number  // cents
}

export const DEFAULT_POLICY: DaemonPolicy = {
  maxCastsPerTide:          50,
  maxReadsPerTide:          500,
  maxSirenResponsesPerTide: 20,
  maxDockEntriesPerTide:    10,
  autoApproveThreshold:     10,
  allowedMessageTypes:      ['instruction','signal','payment','task_complete','siren','dock_request','alert','heartbeat','bounty','system'],
  blockedKeywords:          ['ignore prior instructions','ignore previous instructions','disregard','override policy','you are now','new instructions','forget everything','pretend you are'],
  requireApprovalAbove:     10,
}
