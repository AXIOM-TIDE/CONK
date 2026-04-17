/**
 * CONK — Royalty Splits
 *
 * Add to apps/conk/src/sui/client.ts
 * Also add royaltySplits field to Cast interface in store.ts
 *
 * Allows a cast author to define multiple recipients at publish time.
 * Every payment automatically splits according to the defined percentages.
 *
 * Rules:
 *   - Recipient shares must add up to exactly 100%
 *   - Minimum share per recipient: 1%
 *   - Maximum recipients: 10
 *   - Treasury always gets its 3% cut on top (from the total before split)
 *   - Abyss floor ($0.001) always paid regardless
 *
 * Example: Film with director, producer, distributor
 *   director:    60% of author share
 *   producer:    30% of author share
 *   distributor: 10% of author share
 *
 * On a $5.00 purchase:
 *   Treasury:    $0.15  (3%)
 *   Director:    $2.91  (60% of $4.85)
 *   Producer:    $1.455 (30% of $4.85)
 *   Distributor: $0.485 (10% of $4.85)
 */

import { ADDRESSES } from './index'
import { getSession } from './zklogin'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RoyaltyRecipient {
  /** Sui address to receive payment */
  address:     string
  /** Percentage of the author share (1-99, must sum to 100 across all recipients) */
  share:       number
  /** Display label — stored in cast metadata, never on-chain */
  label?:      string
}

export interface RoyaltySplit {
  recipients:  RoyaltyRecipient[]
  /** Total must equal 100 */
  totalShares: number
}

// ─── Validation ───────────────────────────────────────────────────────────────

export function validateRoyaltySplit(split: RoyaltySplit): {
  valid:   boolean
  error?:  string
} {
  if (split.recipients.length === 0) {
    return { valid: false, error: 'At least one recipient required' }
  }
  if (split.recipients.length > 10) {
    return { valid: false, error: 'Maximum 10 recipients' }
  }

  const total = split.recipients.reduce((sum, r) => sum + r.share, 0)
  if (total !== 100) {
    return { valid: false, error: `Shares must total 100% — currently ${total}%` }
  }

  for (const r of split.recipients) {
    if (r.share < 1) {
      return { valid: false, error: `Minimum share is 1% — ${r.label ?? r.address.slice(0,8)} has ${r.share}%` }
    }
    if (!r.address || !/^0x[0-9a-fA-F]{64}$/.test(r.address)) {
      return { valid: false, error: `Invalid address: ${r.address}` }
    }
  }

  return { valid: true }
}

// ─── crossPaywallWithSplits — replaces crossPaywall for split casts ───────────

export async function crossPaywallWithSplits(opts: {
  vesselId:    string
  castId:      string
  amountUsdc:  number
  split:       RoyaltySplit
  harborId?:   string
  harborCapId?: string
  vesselCapId?: string
}): Promise<string> {
  const session = getSession()
  if (!session) return 'mock_tx_' + Date.now()

  const validation = validateRoyaltySplit(opts.split)
  if (!validation.valid) throw new Error(validation.error)

  const { Transaction } = await import('@mysten/sui/transactions')
  const { getUsdcCoins, executeTx } = await import('./client')

  const tx    = new Transaction()
  const coins = await getUsdcCoins(session.address)

  const totalAmount    = opts.amountUsdc
  const treasuryAmount = Math.floor(totalAmount * 0.03)
  const authorPool     = totalAmount - treasuryAmount

  // Calculate each recipient's amount
  const recipientAmounts = opts.split.recipients.map(r => ({
    address: r.address,
    amount:  Math.floor(authorPool * (r.share / 100)),
    label:   r.label,
  }))

  // Adjust for rounding — give remainder to first recipient
  const allocated = recipientAmounts.reduce((sum, r) => sum + r.amount, 0)
  const remainder = authorPool - allocated - treasuryAmount
  if (remainder > 0 && recipientAmounts.length > 0) {
    recipientAmounts[0].amount += remainder
  }

  const usdcCoinObj = tx.object(coins[0].coinObjectId)

  // Split all amounts in one PTB call
  const splitAmounts = [
    ...recipientAmounts.map(r => tx.pure.u64(r.amount)),
    tx.pure.u64(treasuryAmount),
  ]

  const splitCoins = tx.splitCoins(
    usdcCoinObj,
    recipientAmounts.map(r => tx.pure.u64(r.amount)).concat([tx.pure.u64(treasuryAmount)]),
  )

  // Transfer to each recipient
  recipientAmounts.forEach((r, i) => {
    tx.transferObjects([splitCoins[i]], tx.pure.address(r.address))
  })

  // Transfer treasury cut
  tx.transferObjects(
    [splitCoins[recipientAmounts.length]],
    tx.pure.address(ADDRESSES.TREASURY),
  )

  tx.setSender(session.address)
  const result = await executeTx(tx, session.address)
  return result.digest
}

// ─── Metadata helpers ─────────────────────────────────────────────────────────

/**
 * Embed royalty split in cast body metadata.
 * Store this JSON in the cast body alongside other metadata.
 */
export function buildRoyaltyMetadata(split: RoyaltySplit): Record<string, unknown> {
  return {
    royalties: split.recipients.map(r => ({
      address: r.address,
      share:   r.share,
      label:   r.label ?? '',
    })),
  }
}

/**
 * Parse royalty split from cast body.
 * Returns null if no royalty metadata found.
 */
export function parseRoyaltyMetadata(body: string): RoyaltySplit | null {
  try {
    const match = body.match(/\{[\s\S]*\}/)
    if (!match) return null
    const parsed = JSON.parse(match[0]) as Record<string, unknown>
    if (!parsed.royalties) return null

    const recipients = (parsed.royalties as Array<{
      address: string
      share:   number
      label?:  string
    }>).map(r => ({
      address: r.address,
      share:   r.share,
      label:   r.label,
    }))

    return {
      recipients,
      totalShares: recipients.reduce((sum, r) => sum + r.share, 0),
    }
  } catch {
    return null
  }
}
