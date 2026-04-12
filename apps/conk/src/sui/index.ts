/**
 * CONK Sui Integration Layer
 * Deployed to Sui Mainnet — April 12, 2026
 * Package: 0x8cde30c2af7523193689e2f3eaca6dc4fadf6fd486471a6c31b14bc9db5164b2
 * Treasury: 0xe0117fba317d2267b8d90adca1fe79eceeec756bcf54edf04cc29ee5306ab32e
 * Axiom Tide LLC · Casper, Wyoming
 */

const PROXY = 'https://conk-zkproxy-v2.italktonumbers.workers.dev'

export const NETWORK = import.meta.env.VITE_NETWORK || 'mainnet'

export const ADDRESSES = {
  TREASURY:    '0xe0117fba317d2267b8d90adca1fe79eceeec756bcf54edf04cc29ee5306ab32e',
  ABYSS:       '0x22d066f6337d68848e389402926b4a10424d9728744efb9e6dd0d0ca1c5921c7',
  DRIFT:       '0x95520350968d56b3552521d3ea508934517dde94ad30bb43209aa4fc3cec21de',
  WALRUS_AGG:  'https://aggregator.walrus.site',
  WALRUS_PUB:  'https://publisher.walrus.site',
  SEAL_SERVER: 'https://seal.mystenlabs.com',
}

export const PACKAGES = {
  CONK:  '0x8cde30c2af7523193689e2f3eaca6dc4fadf6fd486471a6c31b14bc9db5164b2',
  RELAY: '0x8cde30c2af7523193689e2f3eaca6dc4fadf6fd486471a6c31b14bc9db5164b2',
}

export const USDC_TYPE = '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC'

export const RPC = {
  MAINNET_RPC: 'https://fullnode.mainnet.sui.io:443',
  PROXY,
}

export const SUI_RPC = RPC.MAINNET_RPC

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '628835024151-6u8eqr51da1ldcteub2986451sg69kpo.apps.googleusercontent.com'
