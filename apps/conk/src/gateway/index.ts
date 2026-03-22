/**
 * CONK Gateway — Main Entry Point
 * Every message entering the daemon passes through here.
 * Content informs. Policy executes. Your agent cannot be hijacked.
 */

export { classify, classifyBatch } from './classifier'
export { inbox } from './inbox'
export { checkRateLimit, recordAction, getVelocityStatus } from './ratelimiter'
export { heartbeat } from './heartbeat'
export type { HeartbeatConfig, HeartbeatSummary } from './heartbeat'
export type {
  GatewayMessage,
  InboxEvent,
  MessageType,
  TrustLevel,
  RiskLevel,
  VelocityRecord,
  DaemonPolicy,
} from './types'
export { DEFAULT_POLICY } from './types'

import { classify } from './classifier'
import { inbox } from './inbox'
import { checkRateLimit, recordAction } from './ratelimiter'
import { DEFAULT_POLICY } from './types'
import type { DaemonPolicy, GatewayMessage } from './types'

export function receive(opts: {
  content: string
  source: string
  ownerVesselId: string | null
  coalitionVesselIds?: string[]
  metadata?: Record<string, unknown>
  policy?: DaemonPolicy
}): GatewayMessage {
  const msg = classify(opts)
  if (msg.allowed) {
    inbox.push({
      type:     msg.type,
      trust:    msg.trust,
      content:  msg.content,
      metadata: { ...msg.metadata, gatewayId: msg.id, flags: msg.flags, risk: msg.risk, requiresApproval: msg.requiresApproval },
    })
  }
  return msg
}

export function check(vesselId: string, action: 'cast' | 'read' | 'siren' | 'dock', policy = DEFAULT_POLICY) {
  return checkRateLimit(vesselId, action, policy)
}

export function record(vesselId: string, action: 'cast' | 'read' | 'siren' | 'dock') {
  recordAction(vesselId, action)
}
