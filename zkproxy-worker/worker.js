/**
 * CONK ZK Proxy + Self-Hosted Gas Station
 * Cloudflare Worker — conk-zkproxy-v2
 * 
 * Routes:
 *   /zkproof → Enoki ZK proof generation
 *   /gas     → Self-hosted gas sponsorship (no Shinami)
 *   /sui     → Sui mainnet RPC
 *   /health  → Health check
 */

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
}

const SUI_MAINNET_RPC = 'https://fullnode.mainnet.sui.io/'
const ENOKI_URL       = 'https://api.enoki.mystenlabs.com/v1/zklogin/zkp'

export default {
  async fetch(request, env) {
    try {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: CORS })
      }

      const path = new URL(request.url).pathname
      const body = await request.text()

      console.log('HIT:', path)

      if (path === '/health') return new Response('ok', { headers: CORS })

      // ── ZK PROOF via Enoki ──────────────────────────────────
      if (path.includes('zkproof')) {
        const req  = JSON.parse(body)
        const resp = await fetch(ENOKI_URL, {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            'zklogin-jwt':   req.jwt,
            'Authorization': `Bearer ${env.ENOKI_KEY}`,
          },
          body: JSON.stringify({
            network:          'mainnet',
            ephemeralPublicKey: req.ephemeralPublicKey,
            maxEpoch:           req.maxEpoch,
            randomness:         req.randomness,
            salt:               req.salt,
          }),
        })
        const text = await resp.text()
        return new Response(text, {
          status:  resp.status,
          headers: { ...CORS, 'Content-Type': 'application/json' },
        })
      }

      // ── SELF-HOSTED GAS SPONSORSHIP ─────────────────────────
      if (path.includes('gas')) {
        const { txBytes, sender } = JSON.parse(body)
        if (!txBytes || !sender) {
          return new Response(JSON.stringify({ error: 'missing txBytes or sender' }), {
            status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
          })
        }

        const privateKey = env.GAS_PRIVATE_KEY
        if (!privateKey) throw new Error('GAS_PRIVATE_KEY not set')

        // Import Sui SDK from esm.sh
        const { Ed25519Keypair } = await import('https://esm.sh/@mysten/sui@1.19.0/keypairs/ed25519')
        const { Transaction }    = await import('https://esm.sh/@mysten/sui@1.19.0/transactions')
        const { SuiClient }      = await import('https://esm.sh/@mysten/sui@1.19.0/client')
        const { fromBase64 }     = await import('https://esm.sh/@mysten/sui@1.19.0/utils')

        const client   = new SuiClient({ url: SUI_MAINNET_RPC })
        const keypair  = Ed25519Keypair.fromSecretKey(privateKey)
        const gasAddr  = keypair.getPublicKey().toSuiAddress()

        // Get gas coins
        const coins = await client.getCoins({ owner: gasAddr, coinType: '0x2::sui::SUI' })
        if (!coins.data.length) throw new Error('Gas wallet empty — top up SUI')

        // Build sponsored transaction
        const tx = Transaction.from(fromBase64(txBytes))
        tx.setSender(sender)
        tx.setGasOwner(gasAddr)
        tx.setGasPayment(coins.data.slice(0, 1).map(c => ({
          objectId: c.coinObjectId,
          version:  c.version,
          digest:   c.digest,
        })))

        const sponsoredBytes = await tx.build({ client })
        const { signature }  = await keypair.signTransaction(sponsoredBytes)

        return new Response(JSON.stringify({
          sponsoredBytes: Buffer.from(sponsoredBytes).toString('base64'),
          sponsorSig:     signature,
        }), {
          status:  200,
          headers: { ...CORS, 'Content-Type': 'application/json' },
        })
      }

      // ── SUI MAINNET RPC ─────────────────────────────────────
      if (path.includes('sui')) {
        const resp = await fetch(SUI_MAINNET_RPC, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        })
        const text = await resp.text()
        return new Response(text, {
          status:  resp.status,
          headers: { ...CORS, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ error: 'not found', path }), {
        status: 404, headers: { ...CORS, 'Content-Type': 'application/json' },
      })

    } catch(e) {
      console.error('ERROR:', e.message, e.stack)
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }
  }
}
