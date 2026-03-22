/**
 * CONK Sui Integration Layer — STEP 6
 *
 * Architecture:
 *   Harbor  → Shore  → Relay Pool  → Vessel Spend Note  → Protocol Action
 *   (human)   (daemon)  (time-delay)  (anonymous)          (cast/read/dock/siren)
 *
 * Stack:
 *   Sui     — state, policy, payment authorization, decay tracking
 *   Walrus  — encrypted blob storage (NEVER plaintext)
 *   Seal    — client-side encryption + policy-gated decryption
 *
 * Treasury:
 *   All fees route to: [TREASURY_ADDRESS — set before mainnet deploy]
 *   No refunds. No recovery.
 */

// ── WALLET ADDRESSES (set before mainnet deploy) ────────────
export const ADDRESSES = {
  // Axiom Tide LLC treasury — receives all protocol fees
  TREASURY:     '' as string,  // TODO: set Axiom Tide LLC Sui wallet

  // Relay pool contract — holds funds between Harbor payment and Vessel draw
  RELAY_POOL:   '' as string,  // TODO: deploy relay pool contract

  // Walrus aggregator — upload encrypted blobs here
  WALRUS_AGG:   'https://aggregator.walrus-testnet.walrus.space' as string,

  // Walrus publisher — fetch blobs here
  WALRUS_PUB:   'https://publisher.walrus-testnet.walrus.space' as string,

  // Seal key server — request decryption capabilities here
  SEAL_SERVER:  'https://seal-dev.mystenlabs.com' as string,
}

// ── PACKAGE IDS (set after contract deployment) ─────────────
export const PACKAGES = {
  CONK:        '' as string,  // TODO: deployed CONK Move package id
  RELAY:       '' as string,  // TODO: deployed relay pool package id
}

// ── RPC CONFIG ──────────────────────────────────────────────
export const RPC = {
  // Shinami sponsored gas — agents don't pay gas directly
  SHINAMI_KEY: '' as string,  // TODO: Shinami API key
  MAINNET_RPC: 'https://fullnode.mainnet.sui.io:443',
  TESTNET_RPC: 'https://fullnode.testnet.sui.io:443',
}

// ── INTEGRATION INTERFACES ──────────────────────────────────

export interface SuiPayResult {
  txDigest: string
  gasUsed: number
  success: boolean
}

export interface WalrusBlob {
  blobId: string
  size: number
  encodedSize: number
  deletable: boolean
}

export interface SealDecryptResult {
  plaintext: Uint8Array
  policyId: string
}

// ── STEP 6 INTEGRATION POINTS ───────────────────────────────
// Each function below replaces a mock in use402.ts or daemon/index.ts.
// Implementation order: pay → sound → read → enterDock → relay

/**
 * STEP 6A — Replace mock pay() in use402.ts
 * Executes real USDC transfer on Sui through the relay pool.
 * Delay is random 30s-5min to break timing correlation.
 */
export async function suiPay(
  vesselId: string,
  amount: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _opts?: { immediate?: boolean }
): Promise<SuiPayResult> {
  // TODO (STEP 6A):
  // 1. Get relay pool object from Sui
  // 2. Draw a spend note from the pool (vessel signs with its keypair)
  // 3. Submit spend note to CONK Move contract: conk::relay::cross_payway()
  // 4. Contract verifies: vessel exists, fuel > 0, object not expired/burned
  // 5. Contract records authorized read, decrements fuel, routes fee to TREASURY
  // 6. Return txDigest
  throw new Error('STEP 6A not implemented — using mock')
}

/**
 * STEP 6B — Replace mock sound() in use402.ts
 * Encrypts cast body, uploads to Walrus, writes metadata to Sui.
 */
export async function suiSound(payload: {
  hook: string
  body: string
  mode: string
  duration: string
  vesselId: string
  keywords?: string[]
  securityQuestion?: string
  unlocksAt?: number
}): Promise<{ txDigest: string; blobId: string; castId: string }> {
  // TODO (STEP 6B):
  // 1. Encrypt payload.body client-side with Seal
  //    - sealClient.encrypt(body, { policyId: vesselId, threshold: 1 })
  // 2. Upload ciphertext to Walrus (NEVER plaintext)
  //    - POST to ADDRESSES.WALRUS_AGG/v1/store
  //    - Store returned blobId
  // 3. Write cast metadata to Sui
  //    - conk::cast::create(hook, mode, duration, blobId, sealPolicyId, keywords)
  //    - metadata only — no body on chain
  // 4. Return txDigest + blobId + castId
  throw new Error('STEP 6B not implemented — using mock')
}

/**
 * STEP 6C — Replace mock read() in daemon/index.ts
 * Fetches encrypted blob from Walrus, decrypts via Seal policy.
 */
export async function suiRead(
  castId: string,
  vesselId: string
): Promise<{ body: string; txDigest: string }> {
  // TODO (STEP 6C):
  // 1. Fetch cast metadata from Sui (blobId, sealPolicyId, expiresAt)
  // 2. Verify cast not expired, not burned, vessel authorized
  // 3. Submit paywall tx: conk::cast::authorize_read(castId, vesselId)
  //    - Contract checks fuel, decrements, routes fee to TREASURY
  // 4. Request decryption from Seal key server
  //    - seal.requestDecryption(blobId, sealPolicyId, vesselKeypair)
  //    - Key server checks Sui policy: vessel authorized? → returns decryption key
  // 5. Fetch encrypted blob from Walrus: GET ADDRESSES.WALRUS_PUB/v1/{blobId}
  // 6. Decrypt client-side with returned key
  // 7. Return plaintext body
  throw new Error('STEP 6C not implemented — using mock')
}

/**
 * STEP 6D — Relay pool draw (timing privacy)
 * Harbor funds pool. Vessels draw spend notes with random delay.
 */
export async function drawFromRelayPool(
  vesselId: string,
  amount: number
): Promise<{ spendNote: string; releaseAt: number }> {
  // TODO (STEP 6D):
  // 1. Harbor calls: relay::fund_pool(amount) → funds go into pool object
  // 2. Vessel calls: relay::draw_note(vesselId, amount)
  //    - Random delay 30s-5min injected here (breaks timing correlation)
  //    - Returns opaque spend note
  // 3. Spend note used in suiPay() instead of direct Harbor payment
  // This is the core of the privacy model — Harbor and Vessel never
  // interact directly in time or in the transaction graph.
  throw new Error('STEP 6D not implemented — using mock')
}

/**
 * STEP 6E — Compromise burn
 * Immediately revokes Seal session, marks vessel dead on Sui.
 */
export async function compromiseBurn(vesselId: string): Promise<{ txDigest: string }> {
  // TODO (STEP 6E):
  // 1. Revoke Seal session keys for this vessel
  // 2. Submit: conk::vessel::compromise_burn(vesselId)
  //    - Marks vessel as dead on chain
  //    - Future spend notes from this vessel are invalid
  //    - Cannot be undone
  throw new Error('STEP 6E not implemented — using mock')
}

// ── WALLET SETUP CHECKLIST ───────────────────────────────────
/**
 * Before mainnet launch, complete these steps:
 *
 * 1. CREATE WALLETS
 *    - Axiom Tide LLC treasury wallet (hardware wallet recommended)
 *    - Protocol deployment wallet (hot wallet, funded with SUI for gas)
 *    - Relay pool operator wallet
 *
 * 2. FUND WALLETS
 *    - Buy WAL tokens for Walrus storage ($500-1000 recommended for launch)
 *    - Buy SUI for gas (testnet free, mainnet ~$50 to start)
 *    - Transfer USDC to treasury wallet
 *
 * 3. DEPLOY CONTRACTS
 *    - sui client publish protocol/sources/ --gas-budget 100000000
 *    - Update PACKAGES.CONK with returned package id
 *    - Deploy relay pool contract
 *    - Update PACKAGES.RELAY
 *
 * 4. SET ADDRESSES
 *    - Update ADDRESSES.TREASURY with LLC wallet address
 *    - Update ADDRESSES.RELAY_POOL with deployed contract
 *    - Switch WALRUS_AGG/PUB from testnet to mainnet URLs
 *
 * 5. GET API KEYS
 *    - Shinami: shinami.com → create app → get gas sponsorship key
 *    - Update RPC.SHINAMI_KEY
 *
 * 6. REPLACE MOCKS
 *    - use402.ts: replace pay() with suiPay()
 *    - use402.ts: replace sound() with suiSound()
 *    - daemon/index.ts: replace read() with suiRead()
 *    - daemon/index.ts: replace drawFuel() with drawFromRelayPool()
 *    - daemon/index.ts: replace burn() with compromiseBurn()
 *
 * 7. TEST ON TESTNET
 *    - Run: npx ts-node tests/agent-protocol-test.ts
 *    - All 6 suites must pass before mainnet
 *
 * 8. FLIP SWITCH
 *    - Change RPC from TESTNET_RPC to MAINNET_RPC
 *    - Update Walrus URLs from testnet to mainnet
 *    - Deploy
 */
