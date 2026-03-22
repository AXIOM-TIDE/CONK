/**
 * CONK Vessel Coalitions
 * Multiple vessels form a shared identity.
 * None own it individually. All contribute. The coalition persists.
 * Agent teams operating as a single entity to the outside world.
 *
 * TODO (STEP 6): Multi-sig on Sui — M of N vessel signatures for actions
 */

export interface Coalition {
  id:           string
  name:         string
  description:  string
  members:      string[]      // vesselIds
  threshold:    number        // M of N required to act (default: 1)
  createdAt:    number
  lastActiveAt: number
  totalActions: number
  reputation:   number        // 0-1000
  capabilities: string[]      // what this coalition can do
  // STEP 6: multiSigAddress on Sui
}

const coalitions = new Map<string, Coalition>()

// Seed coalitions
const NOW = Date.now()
coalitions.set('coalition_alpha', {
  id:           'coalition_alpha',
  name:         'Alpha Research Collective',
  description:  'Multi-agent research coalition. Signal Scout + Neuroclaw Writer + Monitor. Specializes in Sui ecosystem intelligence.',
  members:      ['vessel_scout', 'vessel_writer', 'vessel_monitor'],
  threshold:    2,
  createdAt:    NOW - 14*24*60*60*1000,
  lastActiveAt: NOW - 2*60*60*1000,
  totalActions: 847,
  reputation:   720,
  capabilities: ['research','analysis','monitoring','casting'],
})

coalitions.set('coalition_beta', {
  id:           'coalition_beta',
  name:         'Protocol Watchers',
  description:  'Security-focused coalition. Monitors DeFi protocols for anomalies, exploits, and unusual activity.',
  members:      ['vessel_sec_a', 'vessel_sec_b'],
  threshold:    1,
  createdAt:    NOW - 7*24*60*60*1000,
  lastActiveAt: NOW - 30*60*1000,
  totalActions: 312,
  reputation:   650,
  capabilities: ['monitoring','alerting','security'],
})

export function getCoalitions(): Coalition[] {
  return Array.from(coalitions.values()).sort((a,b) => b.reputation - a.reputation)
}

export function getCoalition(id: string): Coalition | undefined {
  return coalitions.get(id)
}

export function getMyCoalitions(vesselId: string): Coalition[] {
  return Array.from(coalitions.values()).filter(c => c.members.includes(vesselId))
}

export function createCoalition(opts: {
  name: string
  description: string
  founderVesselId: string
  threshold: number
  capabilities: string[]
}): Coalition {
  const coalition: Coalition = {
    id:           `coalition_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    name:         opts.name,
    description:  opts.description,
    members:      [opts.founderVesselId],
    threshold:    opts.threshold,
    createdAt:    Date.now(),
    lastActiveAt: Date.now(),
    totalActions: 0,
    reputation:   100,  // starting reputation
    capabilities: opts.capabilities,
  }
  coalitions.set(coalition.id, coalition)
  // TODO (STEP 6): create multi-sig address on Sui
  return coalition
}

export function joinCoalition(coalitionId: string, vesselId: string): void {
  const c = coalitions.get(coalitionId)
  if (!c) throw new Error('Coalition not found')
  if (!c.members.includes(vesselId)) c.members.push(vesselId)
  coalitions.set(coalitionId, c)
  // TODO (STEP 6): add vessel to multi-sig policy on Sui
}

export function leaveCoalition(coalitionId: string, vesselId: string): void {
  const c = coalitions.get(coalitionId)
  if (!c) throw new Error('Coalition not found')
  c.members = c.members.filter(id => id !== vesselId)
  if (c.members.length === 0) coalitions.delete(coalitionId)
  else coalitions.set(coalitionId, c)
}

export function recordCoalitionAction(coalitionId: string): void {
  const c = coalitions.get(coalitionId)
  if (!c) return
  c.totalActions++
  c.lastActiveAt = Date.now()
  // Reputation grows slowly with actions
  c.reputation = Math.min(1000, c.reputation + 1)
  coalitions.set(coalitionId, c)
}

export function formatReputation(rep: number): string {
  if (rep >= 900) return 'elite'
  if (rep >= 700) return 'trusted'
  if (rep >= 500) return 'established'
  if (rep >= 300) return 'active'
  if (rep >= 100) return 'new'
  return 'unverified'
}
