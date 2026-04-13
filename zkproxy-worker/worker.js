/**
 * CONK ZK Proxy + Self-Hosted Gas Station
 * Uses Sui's sponsored transaction pattern correctly.
 */

import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'
import { Transaction } from '@mysten/sui/transactions'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
}

const SUI_RPC   = 'https://fullnode.mainnet.sui.io/'
const ENOKI_URL = 'https://api.enoki.mystenlabs.com/v1/zklogin/zkp'

function toB64(bytes) {
  return btoa(String.fromCharCode(...bytes))
}

function fromB64(str) {
  return Uint8Array.from(atob(str), c => c.charCodeAt(0))
}

async function rpc(method, params) {
  const resp = await fetch(SUI_RPC, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })
  const json = await resp.json()
  if (json.error) throw new Error('RPC: ' + JSON.stringify(json.error))
  return json.result
}

export default {
  async fetch(request, env) {
    try {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: CORS })
      }

      const path = new URL(request.url).pathname
      const body = await request.text()

      if (path === '/health') return new Response('ok', { headers: CORS })

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
            network:            'mainnet',
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

      if (path.includes('gas')) {
        const { txBytes, sender } = JSON.parse(body)
        if (!txBytes || !sender) {
          return new Response(JSON.stringify({ error: 'missing txBytes or sender' }), {
            status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
          })
        }

        const privateKey = env.GAS_PRIVATE_KEY
        if (!privateKey) throw new Error('GAS_PRIVATE_KEY not set')

        const keypair = Ed25519Keypair.fromSecretKey(privateKey)
        const gasAddr = keypair.getPublicKey().toSuiAddress()

        // Get gas coins and reference gas price
        const [coinsResult, refGasPrice] = await Promise.all([
          rpc('suix_getCoins', [gasAddr, '0x2::sui::SUI', null, 1]),
          rpc('suix_getReferenceGasPrice', []),
        ])

        if (!coinsResult.data?.length) throw new Error('Gas wallet empty — top up SUI at ' + gasAddr)
        const coin = coinsResult.data[0]

        // Build full sponsored transaction from kind bytes
        const tx = Transaction.fromKind(fromB64(txBytes))
        tx.setSender(sender)
        tx.setGasOwner(gasAddr)
        tx.setGasPrice(Number(refGasPrice))
        tx.setGasBudget(10000000)
        tx.setGasPayment([{
          objectId: coin.coinObjectId,
          version:  coin.version,
          digest:   coin.digest,
        }])

        // Build and sign
        const builtBytes = await tx.build()
        const { signature } = await keypair.signTransaction(builtBytes)

        return new Response(JSON.stringify({
          sponsoredBytes: toB64(builtBytes),
          sponsorSig:     signature,
        }), {
          status:  200,
          headers: { ...CORS, 'Content-Type': 'application/json' },
        })
      }

      if (path.includes('sui')) {
        const resp = await fetch(SUI_RPC, {
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
