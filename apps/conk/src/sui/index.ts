/**
 * CONK Sui Integration Layer
 * Deployed to Sui Mainnet — April 22, 2026 (v5)
 * Package: 0xb9588bfeaec922d7eff0d231a3cab59d6942962df4db4598d38c545b0ed24c47
 * Treasury: 0xe0117fba317d2267b8d90adca1fe79eceeec756bcf54edf04cc29ee5306ab32e
 * Axiom Tide LLC · Casper, Wyoming
 */

const PROXY = 'https://conk-zkproxy-v2.italktonumbers.workers.dev'

export const NETWORK = import.meta.env.VITE_NETWORK || 'mainnet'

export const ADDRESSES = {
  TREASURY:    '0xe0117fba317d2267b8d90adca1fe79eceeec756bcf54edf04cc29ee5306ab32e',
  ABYSS:       '0x779262b60c380beab5b88004395210c161328e9061101918ded6f45067e91e3d',
  DRIFT:       '0xe3d3006c7fa7de8ebfb58e883eb7f447ecc6ef4647eca2cb4ed149f79e8bfb93',
  WALRUS_AGG:  'https://aggregator.walrus.site',
  WALRUS_PUB:  'https://publisher.walrus.site',
  SEAL_SERVER: 'https://seal.mystenlabs.com',
}

export const PACKAGES = {
  CONK:  '0xb9588bfeaec922d7eff0d231a3cab59d6942962df4db4598d38c545b0ed24c47',
  RELAY: '0xb9588bfeaec922d7eff0d231a3cab59d6942962df4db4598d38c545b0ed24c47',
}

export const USDC_TYPE = '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC'

export const RPC = {
  MAINNET_RPC: 'https://fullnode.mainnet.sui.io:443',
  PROXY,
}

export const SUI_RPC = RPC.MAINNET_RPC

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '628835024151-6u8eqr51da1ldcteub2986451sg69kpo.apps.googleusercontent.com'
