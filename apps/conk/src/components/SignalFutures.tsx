/**
 * CONK Signal Futures
 * A cast that unlocks when an on-chain condition is met.
 * Not just a timestamp — a real condition verified by the chain.
 *
 * "This signal unlocks when SUI price crosses $10"
 * "This signal unlocks when tide count on cast X reaches 100k"
 *
 * TODO (STEP 6): Conditions verified by Sui oracle / Move contract
 */

export type FutureConditionType =
  | 'timestamp'       // already implemented — unlock at specific time
  | 'tide_threshold'  // unlock when cast X reaches N reads
  | 'price_trigger'   // unlock when asset crosses price
  | 'lighthouse'      // unlock when a specific cast becomes Lighthouse
  | 'manual'          // poster manually triggers unlock

export interface FutureCondition {
  type:           FutureConditionType
  // timestamp
  unlocksAt?:     number
  // tide_threshold
  targetCastId?:  string
  targetTide?:    number
  // price_trigger
  asset?:         string    // 'SUI' | 'WAL' | 'USDC'
  targetPrice?:   number    // in cents
  direction?:     'above' | 'below'
  // lighthouse
  lighthouseCastId?: string
  // display
  label:          string    // human-readable description
}

export function evaluateCondition(
  condition: FutureCondition,
  context: { currentTides?: Record<string, number>; currentPrices?: Record<string, number> }
): boolean {
  switch (condition.type) {
    case 'timestamp':
      return !!condition.unlocksAt && Date.now() >= condition.unlocksAt

    case 'tide_threshold':
      if (!condition.targetCastId || !condition.targetTide) return false
      const tide = context.currentTides?.[condition.targetCastId] ?? 0
      return tide >= condition.targetTide

    case 'price_trigger':
      if (!condition.asset || !condition.targetPrice) return false
      const price = context.currentPrices?.[condition.asset] ?? 0
      return condition.direction === 'above'
        ? price >= condition.targetPrice
        : price <= condition.targetPrice

    case 'lighthouse':
      // TODO (STEP 6): check if cast has Lighthouse status on Sui
      return false

    case 'manual':
      return false // requires poster action

    default:
      return false
  }
}

export function buildConditionLabel(condition: FutureCondition): string {
  switch (condition.type) {
    case 'timestamp':
      return condition.unlocksAt
        ? `Unlocks ${new Date(condition.unlocksAt).toLocaleDateString()}`
        : 'Scheduled release'
    case 'tide_threshold':
      return `Unlocks when cast reaches ${(condition.targetTide ?? 0).toLocaleString()} reads`
    case 'price_trigger':
      return `Unlocks when ${condition.asset} ${condition.direction} $${((condition.targetPrice ?? 0) / 100).toFixed(2)}`
    case 'lighthouse':
      return 'Unlocks when target cast reaches Lighthouse'
    case 'manual':
      return 'Manual release by poster'
    default:
      return 'Unknown condition'
  }
}

// Preset conditions for the UI
export const PRESET_CONDITIONS: Omit<FutureCondition, 'label'>[] = [
  { type: 'timestamp',       unlocksAt: Date.now() + 24*3600000 },
  { type: 'timestamp',       unlocksAt: Date.now() + 7*24*3600000 },
  { type: 'tide_threshold',  targetTide: 100000 },
  { type: 'price_trigger',   asset: 'SUI', targetPrice: 1000, direction: 'above' },
  { type: 'lighthouse' },
  { type: 'manual' },
]
