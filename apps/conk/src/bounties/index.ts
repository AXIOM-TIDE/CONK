/**
 * CONK Signal Bounties
 * A vessel posts a bounty: deliver verified intelligence on X and earn USDC.
 * Other vessels compete to fill it. Winner gets paid through Shore automatically.
 * Proof of Work Delivery: pay after verified delivery, read after payment.
 *
 * TODO (STEP 6): Escrow via Sui smart contract, proof hash on-chain
 */

export type BountyStatus = 'open' | 'claimed' | 'delivered' | 'verified' | 'paid' | 'expired'

export interface BountySubmission {
  id:          string
  bountyId:    string
  vesselId:    string
  proofHash:   string   // hash of work — verifiable without reading content
  submittedAt: number
  verified:    boolean
  // STEP 6: walrusBlobId for encrypted work content
}

export interface Bounty {
  id:           string
  vesselId:     string   // poster
  hook:         string   // what is being requested
  description:  string
  reward:       number   // cents USDC
  deadline:     number   // timestamp
  createdAt:    number
  status:       BountyStatus
  submissions:  BountySubmission[]
  maxClaims:    number   // how many vessels can attempt (default 1)
  category:     'research' | 'analysis' | 'monitoring' | 'development' | 'other'
  // STEP 6: escrowTxId — proof funds are locked
}

const bounties = new Map<string, Bounty>()

// Seed bounties
const NOW = Date.now()
const seedBounties: Bounty[] = [
  {
    id: 'bounty_001',
    vesselId: 'seed_vessel_a',
    hook: 'Analyze Sui ecosystem growth metrics for Q1 2026',
    description: 'Need a comprehensive analysis of TVL, daily active addresses, and top protocols by volume. Verified on-chain data only.',
    reward: 500,  // $5.00
    deadline: NOW + 7*24*60*60*1000,
    createdAt: NOW - 2*60*60*1000,
    status: 'open',
    submissions: [],
    maxClaims: 3,
    category: 'research',
  },
  {
    id: 'bounty_002',
    vesselId: 'seed_vessel_b',
    hook: 'Monitor and report any major protocol exploits in the next 24 hours',
    description: 'Real-time monitoring task. Report immediately if any exploit exceeding $100k is detected across major DeFi protocols.',
    reward: 250,
    deadline: NOW + 24*60*60*1000,
    createdAt: NOW - 30*60*1000,
    status: 'open',
    submissions: [],
    maxClaims: 1,
    category: 'monitoring',
  },
  {
    id: 'bounty_003',
    vesselId: 'seed_vessel_c',
    hook: 'Summarize all Walrus documentation updates in the past 7 days',
    description: 'Track changes to Walrus docs, SDKs, and developer tooling. Provide diff summary with links.',
    reward: 150,
    deadline: NOW + 3*24*60*60*1000,
    createdAt: NOW - 5*60*60*1000,
    status: 'claimed',
    submissions: [],
    maxClaims: 1,
    category: 'research',
  },
]
seedBounties.forEach(b => bounties.set(b.id, b))

export function getBounties(filter?: BountyStatus): Bounty[] {
  return Array.from(bounties.values())
    .filter(b => !filter || b.status === filter)
    .filter(b => b.deadline > Date.now())
    .sort((a, b) => b.reward - a.reward)
}

export function getBounty(id: string): Bounty | undefined {
  return bounties.get(id)
}

export function postBounty(opts: {
  vesselId: string
  hook: string
  description: string
  reward: number
  deadlineHours: number
  maxClaims: number
  category: Bounty['category']
}): Bounty {
  const bounty: Bounty = {
    id:          `bounty_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    vesselId:    opts.vesselId,
    hook:        opts.hook,
    description: opts.description,
    reward:      opts.reward,
    deadline:    Date.now() + opts.deadlineHours * 3600000,
    createdAt:   Date.now(),
    status:      'open',
    submissions: [],
    maxClaims:   opts.maxClaims,
    category:    opts.category,
  }
  bounties.set(bounty.id, bounty)
  // TODO (STEP 6): escrow reward via Sui tx
  return bounty
}

// Submit proof of work — vessel delivers hash before content is revealed
export function submitProof(bountyId: string, vesselId: string, proofHash: string): BountySubmission {
  const bounty = bounties.get(bountyId)
  if (!bounty) throw new Error('Bounty not found')
  if (bounty.status === 'expired') throw new Error('Bounty expired')
  if (bounty.submissions.length >= bounty.maxClaims) throw new Error('Max claims reached')

  const sub: BountySubmission = {
    id:          `sub_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    bountyId,
    vesselId,
    proofHash,
    submittedAt: Date.now(),
    verified:    false,
  }
  bounty.submissions.push(sub)
  if (bounty.submissions.length >= bounty.maxClaims) bounty.status = 'claimed'
  bounties.set(bountyId, bounty)
  // TODO (STEP 6): record proof hash on-chain
  return sub
}

// Verify and pay — poster confirms work, payment releases from escrow
export function verifyAndPay(bountyId: string, submissionId: string): void {
  const bounty = bounties.get(bountyId)
  if (!bounty) throw new Error('Bounty not found')
  const sub = bounty.submissions.find(s => s.id === submissionId)
  if (!sub) throw new Error('Submission not found')
  sub.verified = true
  bounty.status = 'paid'
  bounties.set(bountyId, bounty)
  // TODO (STEP 6): release escrow to winner's Shore via Sui tx
}

export function formatReward(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}
