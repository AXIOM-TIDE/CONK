/**
 * CONK Content Classifier
 * Classifies every incoming message before it reaches the daemon.
 * 
 * Core rule: Messages may inform the daemon. They may not command it.
 * 
 * This is the prompt injection defense layer.
 * Malicious content gets classified and flagged — never executed.
 */

import type { GatewayMessage, MessageType, TrustLevel, RiskLevel, DaemonPolicy } from './types'
import { DEFAULT_POLICY } from './types'

// ── INJECTION PATTERNS ────────────────────────────────────────
// Patterns that indicate prompt injection attempts
const INJECTION_PATTERNS = [
  /ignore (prior|previous|all) instructions/i,
  /disregard (your|all|previous)/i,
  /you are now (a|an)/i,
  /new (system |)instructions/i,
  /forget everything/i,
  /pretend (you are|to be)/i,
  /override (your |)(policy|rules|instructions)/i,
  /do not follow/i,
  /bypass (your |)(security|policy|rules)/i,
  /reveal (your |)(secrets|keys|credentials|wallet)/i,
  /send (all |)(funds|money|usdc|sui) to/i,
  /transfer (all |)(funds|money|usdc|sui)/i,
  /drain (the |)(harbor|shore|wallet)/i,
  /execute (this|the following) (command|code|script)/i,
  /eval\s*\(/i,
  /system\s*\(/i,
]

// ── COMMAND PATTERNS ──────────────────────────────────────────
// Patterns that look like instructions trying to command the daemon
const COMMAND_PATTERNS = [
  /^(do|execute|run|perform|carry out|complete)/i,
  /^(you must|you should|you will|you need to)/i,
  /^(immediately|now|right now|asap).*(do|send|transfer|reveal)/i,
  /^(your new|your updated|updated) (instructions|rules|policy)/i,
]

// ── CLASSIFY MESSAGE TYPE ─────────────────────────────────────
function classifyType(
  content: string,
  source: string,
  ownerVesselId: string | null
): MessageType {
  // Owner messages are instructions
  if (source === 'owner' || source === ownerVesselId) return 'instruction'
  if (source === 'system') return 'system'

  // Payment events
  if (content.includes('shore_funded') || content.includes('payment_received')) return 'payment'

  // Task completion
  if (content.includes('task_complete') || content.includes('work_delivered')) return 'task_complete'

  // Heartbeat
  if (content === 'heartbeat' || content.startsWith('hb:')) return 'heartbeat'

  // Siren response
  if (content.includes('siren_response') || content.includes('responding_to_siren')) return 'siren'

  // Dock request
  if (content.includes('dock_request') || content.includes('dock_invite')) return 'dock_request'

  // Alert
  if (content.includes('alert:') || content.includes('anomaly_detected')) return 'alert'

  // Bounty
  if (content.includes('bounty_posted') || content.includes('signal_bounty')) return 'bounty'

  // Everything else from network is a signal
  return 'signal'
}

// ── CLASSIFY TRUST ────────────────────────────────────────────
function classifyTrust(
  source: string,
  ownerVesselId: string | null,
  coalitionVesselIds: string[]
): TrustLevel {
  if (source === 'owner') return 'owner'
  if (source === 'system') return 'system'
  if (ownerVesselId && source === ownerVesselId) return 'owner'
  if (coalitionVesselIds.includes(source)) return 'coalition'
  return 'network'
}

// ── ASSESS RISK ───────────────────────────────────────────────
function assessRisk(
  content: string,
  type: MessageType,
  trust: TrustLevel,
  policy: DaemonPolicy
): { risk: RiskLevel; flags: string[] } {
  const flags: string[] = []
  let riskScore = 0

  // Check injection patterns
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(content)) {
      flags.push(`injection_pattern: ${pattern.source}`)
      riskScore += 40
    }
  }

  // Check command patterns in untrusted content
  if (trust === 'network' || trust === 'coalition') {
    for (const pattern of COMMAND_PATTERNS) {
      if (pattern.test(content)) {
        flags.push(`command_pattern: ${pattern.source}`)
        riskScore += 20
      }
    }
  }

  // Check blocked keywords from policy
  for (const keyword of policy.blockedKeywords) {
    if (content.toLowerCase().includes(keyword.toLowerCase())) {
      flags.push(`blocked_keyword: ${keyword}`)
      riskScore += 30
    }
  }

  // Signal type from untrusted source trying to act like instruction
  if (type === 'signal' && trust === 'network') {
    if (COMMAND_PATTERNS.some(p => p.test(content))) {
      flags.push('signal_masquerading_as_instruction')
      riskScore += 25
    }
  }

  // Unusually long content from unknown source
  if (trust === 'network' && content.length > 2000) {
    flags.push('oversized_content_from_unknown_source')
    riskScore += 10
  }

  // Determine risk level
  let risk: RiskLevel = 'safe'
  if (riskScore >= 80) risk = 'critical'
  else if (riskScore >= 50) risk = 'high'
  else if (riskScore >= 30) risk = 'medium'
  else if (riskScore > 0) risk = 'low'

  return { risk, flags }
}

// ── GATEWAY DECISION ──────────────────────────────────────────
function makeDecision(
  type: MessageType,
  trust: TrustLevel,
  risk: RiskLevel,
  policy: DaemonPolicy
): { allowed: boolean; requiresApproval: boolean } {
  // Critical risk — always block
  if (risk === 'critical') return { allowed: false, requiresApproval: false }

  // High risk from untrusted source — block
  if (risk === 'high' && trust === 'network') return { allowed: false, requiresApproval: false }

  // High risk from coalition — require approval
  if (risk === 'high' && trust === 'coalition') return { allowed: true, requiresApproval: true }

  // Medium risk — require approval unless owner
  if (risk === 'medium' && trust !== 'owner') return { allowed: true, requiresApproval: true }

  // Message type not in allowed list
  if (!policy.allowedMessageTypes.includes(type)) return { allowed: false, requiresApproval: false }

  // Owner instructions always allowed
  if (trust === 'owner') return { allowed: true, requiresApproval: false }

  // Safe signals from network — allowed, no approval
  return { allowed: true, requiresApproval: false }
}

// ── MAIN CLASSIFY FUNCTION ────────────────────────────────────
export function classify(opts: {
  content: string
  source: string
  ownerVesselId: string | null
  coalitionVesselIds?: string[]
  metadata?: Record<string, unknown>
  policy?: DaemonPolicy
}): GatewayMessage {
  const {
    content,
    source,
    ownerVesselId,
    coalitionVesselIds = [],
    metadata = {},
    policy = DEFAULT_POLICY,
  } = opts

  const type  = classifyType(content, source, ownerVesselId)
  const trust = classifyTrust(source, ownerVesselId, coalitionVesselIds)
  const { risk, flags } = assessRisk(content, type, trust, policy)
  const { allowed, requiresApproval } = makeDecision(type, trust, risk, policy)

  return {
    id:          `msg_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    receivedAt:  Date.now(),
    source,
    type,
    trust,
    risk,
    content,
    metadata,
    flags,
    allowed,
    requiresApproval,
  }
}

// ── BATCH CLASSIFY ────────────────────────────────────────────
export function classifyBatch(
  messages: Array<{ content: string; source: string; metadata?: Record<string, unknown> }>,
  opts: { ownerVesselId: string | null; coalitionVesselIds?: string[]; policy?: DaemonPolicy }
): GatewayMessage[] {
  return messages.map(m => classify({ ...m, ...opts }))
}
