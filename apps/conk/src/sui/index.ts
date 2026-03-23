/**
 * CONK Sui Integration Layer — STEP 6
 * Treasury: 0x1d67c64a405aaca736e5a1c45e7251e37a634e5c32b15cb875ee83e4cd6ec204
 * Axiom Tide LLC · Casper, Wyoming
 */

export const ADDRESSES = {
  TREASURY:    '0x1d67c64a405aaca736e5a1c45e7251e37a634e5c32b15cb875ee83e4cd6ec204',
  RELAY_POOL:  '' as string,
  WALRUS_AGG:  'https://aggregator.walrus-testnet.walrus.space',
  WALRUS_PUB:  'https://publisher.walrus-testnet.walrus.space',
  SEAL_SERVER: 'https://seal-dev.mystenlabs.com',
}

export const PACKAGES = {
  CONK:  '0x135f21155784b0533a9d4565245f67e3e38e32fb9710ec9acf6ea15503f344bf',
  RELAY: '0x135f21155784b0533a9d4565245f67e3e38e32fb9710ec9acf6ea15503f344bf',
}

export const RPC = {
  SHINAMI_KEY:     'us1_sui_testnet_a1a53851661244fa9c395338586d2ba3',
  SHINAMI_RPC:     'https://api.us1.shinami.com/sui/node/v1',
  SHINAMI_WSS:     'wss://api.us1.shinami.com/sui/node/v1',
  SHINAMI_GAS:     'https://api.us1.shinami.com/gas/v1',
  MAINNET_RPC:     'https://fullnode.mainnet.sui.io:443',
  TESTNET_RPC:     'https://fullnode.testnet.sui.io:443',
}

export interface SuiPayResult   { txDigest: string; gasUsed: number; success: boolean }
export interface WalrusBlob     { blobId: string; size: number }
export interface SealDecryptResult { plaintext: Uint8Array; policyId: string }

/**
 * STEP 6 CHECKLIST — complete in order:
 * 1. Shinami API key → RPC.SHINAMI_KEY above
 * 2. Deploy contracts → sui client publish protocol/sources/
 * 3. Package ID → PACKAGES.CONK above
 * 4. npm install @mysten/sui.js
 * 5. Implement src/sui/client.ts functions
 * 6. Replace mocks in daemon/index.ts and hooks/use402.ts
 * 7. Test on testnet
 * 8. Switch Walrus URLs to mainnet
 * 9. Deploy
 */
