/**
 * CONK Sui Integration Layer — STEP 6
 * Treasury: 0x1d67c64a405aaca736e5a1c45e7251e37a634e5c32b15cb875ee83e4cd6ec204
 * Axiom Tide LLC · Casper, Wyoming
 */

const IS_PROD = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
const PROXY = 'https://axiom-tide-production.up.railway.app'

export const ADDRESSES = {
  TREASURY:    import.meta.env.VITE_TREASURY_ADDRESS || '0x1d67c64a405aaca736e5a1c45e7251e37a634e5c32b15cb875ee83e4cd6ec204',
  RELAY_POOL:  import.meta.env.VITE_RELAY_POOL_ADDRESS || '' as string,
  ABYSS:       import.meta.env.VITE_ABYSS_ADDRESS || '0xdce0b9ce76ec0f4ad1026fa58eeb0fb837be30b84a4b89fcb547fb5963c86277',
  DRIFT:       import.meta.env.VITE_DRIFT_ADDRESS || '0xfd89573b1948caacd9356a0272bcf73d7f361cb00bdf8fc59f012216ab038bc0',
  WALRUS_AGG:  'https://aggregator.walrus-testnet.walrus.space',
  WALRUS_PUB:  'https://publisher.walrus-testnet.walrus.space',
  SEAL_SERVER: 'https://seal-dev.mystenlabs.com',
}

export const PACKAGES = {
  CONK:  import.meta.env.VITE_CONK_PACKAGE_ID || '0x135f21155784b0533a9d4565245f67e3e38e32fb9710ec9acf6ea15503f344bf',
  RELAY: import.meta.env.VITE_CONK_PACKAGE_ID || '0x135f21155784b0533a9d4565245f67e3e38e32fb9710ec9acf6ea15503f344bf',
}

const SHINAMI_KEY = import.meta.env.VITE_SHINAMI_KEY || ''

export const RPC = {
  SHINAMI_KEY,
  SHINAMI_RPC:  IS_PROD ? `${PROXY}/api/sui` : `https://api.us1.shinami.com/sui/node/v1/${SHINAMI_KEY}`,
  SHINAMI_WSS:  `wss://api.us1.shinami.com/sui/node/v1/${SHINAMI_KEY}`,
  SHINAMI_GAS:  IS_PROD ? `${PROXY}/api/gas` : 'https://api.us1.shinami.com/gas/v1',
  TESTNET_RPC:  IS_PROD ? `${PROXY}/api/sui` : 'https://fullnode.testnet.sui.io:443',
  MAINNET_RPC:  'https://fullnode.mainnet.sui.io:443',
}

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '628835024151-6u8eqr51da1ldcteub2986451sg69kpo.apps.googleusercontent.com'
