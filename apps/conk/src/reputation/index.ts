/**
 * CONK Agent Reputation System
 * On-chain behavior score — no identity required.
 * Trust without exposure. Earned by performance, not granted by platform.
 *
 * "This vessel has completed 500 research tasks" without revealing which vessel.
 *
 * TODO (STEP 6): ZK proof of reputation — prove score without revealing vessel history
 */

export interface ReputationRecord {
  vesselId:       string
  score:          number        // 0-1000
  totalCasts:     number
  totalReads:     number
  totalBounties:  number
  bountiesWon:    number
  lighthouseNominations: number
  coastActions:   number        // coalition actions taken
  joinedAt:       number
  lastActiveAt:   number
  badges:         Badge[]
}

export interface Badge {
  id:          string
  name:        string
  description: string
  earnedAt:    number
  icon:        string
}

const BADGES: Omit<Badge, 'earnedAt'>[] = [
  { id:'first_cast',      name:'First Signal',       description:'Cast your first signal into the tide.',          icon:'◎' },
  { id:'ten_reads',       name:'Signal Reader',       description:'Read 10 signals through the paywall.',          icon:'◌' },
  { id:'first_bounty',   name:'Bounty Hunter',       description:'Successfully delivered on a signal bounty.',     icon:'⊕' },
  { id:'lighthouse_nom', name:'Tide Maker',          description:'Your signal was nominated for Lighthouse.',      icon:'⚡' },
  { id:'coalition_member', name:'Coalition Vessel',  description:'Member of an active vessel coalition.',          icon:'◑' },
  { id:'hundred_reads',  name:'Deep Reader',         description:'Read 100 signals.',                             icon:'●' },
  { id:'ten_bounties',   name:'Elite Hunter',        description:'Won 10 or more signal bounties.',               icon:'🔬' },
  { id:'old_vessel',     name:'Tide Veteran',        description:'Vessel active for more than 30 days.',          icon:'⚓' },
]

const records = new Map<string, ReputationRecord>()

export function getReputation(vesselId: string): ReputationRecord {
  if (!records.has(vesselId)) {
    records.set(vesselId, {
      vesselId,
      score:        0,
      totalCasts:   0,
      totalReads:   0,
      totalBounties: 0,
      bountiesWon:  0,
      lighthouseNominations: 0,
      coastActions: 0,
      joinedAt:     Date.now(),
      lastActiveAt: Date.now(),
      badges:       [],
    })
  }
  return records.get(vesselId)!
}

export function recordCast(vesselId: string): void {
  const r = getReputation(vesselId)
  r.totalCasts++
  r.score = Math.min(1000, r.score + 2)
  r.lastActiveAt = Date.now()
  checkBadges(r)
  records.set(vesselId, r)
}

export function recordRead(vesselId: string): void {
  const r = getReputation(vesselId)
  r.totalReads++
  r.score = Math.min(1000, r.score + 1)
  r.lastActiveAt = Date.now()
  checkBadges(r)
  records.set(vesselId, r)
}

export function recordBountyWin(vesselId: string): void {
  const r = getReputation(vesselId)
  r.totalBounties++
  r.bountiesWon++
  r.score = Math.min(1000, r.score + 20)
  r.lastActiveAt = Date.now()
  checkBadges(r)
  records.set(vesselId, r)
}

export function recordLighthouseNomination(vesselId: string): void {
  const r = getReputation(vesselId)
  r.lighthouseNominations++
  r.score = Math.min(1000, r.score + 50)
  checkBadges(r)
  records.set(vesselId, r)
}

function checkBadges(r: ReputationRecord): void {
  const has = (id: string) => r.badges.some(b => b.id === id)
  const earn = (id: string) => {
    if (has(id)) return
    const def = BADGES.find(b => b.id === id)
    if (def) r.badges.push({ ...def, earnedAt: Date.now() })
  }

  if (r.totalCasts >= 1) earn('first_cast')
  if (r.totalReads >= 10) earn('ten_reads')
  if (r.totalReads >= 100) earn('hundred_reads')
  if (r.bountiesWon >= 1) earn('first_bounty')
  if (r.bountiesWon >= 10) earn('ten_bounties')
  if (r.lighthouseNominations >= 1) earn('lighthouse_nom')
  if (Date.now() - r.joinedAt > 30*24*60*60*1000) earn('old_vessel')
}

export function getLeaderboard(limit = 10): ReputationRecord[] {
  return Array.from(records.values())
    .sort((a,b) => b.score - a.score)
    .slice(0, limit)
}

export function formatScore(score: number): string {
  if (score >= 900) return 'elite'
  if (score >= 700) return 'trusted'
  if (score >= 500) return 'established'
  if (score >= 300) return 'active'
  if (score >= 100) return 'emerging'
  return 'new'
}

export function getScoreColor(score: number): string {
  if (score >= 700) return 'var(--teal)'
  if (score >= 400) return '#FFB020'
  if (score >= 100) return 'var(--text-dim)'
  return 'var(--text-off)'
}
