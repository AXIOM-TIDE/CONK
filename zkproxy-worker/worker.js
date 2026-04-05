const SHINAMI_KEY = 'us1_sui_testnet_a1a53851661244fa9c395338586d2ba3'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
}

export default {
  async fetch(request) {
    try {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: CORS })
      }
      const path = new URL(request.url).pathname
      const body = await request.text()
      console.log('HIT:', path)

      if (path === '/health') return new Response('ok', { headers: CORS })

      if (path === '/zkproof') {
        const resp = await fetch('https://api.us1.shinami.com/zklogin/v1/prove', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-Key': SHINAMI_KEY },
          body,
        })
        return new Response(await resp.text(), { status: resp.status, headers: { ...CORS, 'Content-Type': 'application/json' } })
      }

      if (path === '/gas') {
        const resp = await fetch('https://api.us1.shinami.com/gas/v1/gas_sponsorTransactionBlock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-Key': SHINAMI_KEY },
          body,
        })
        return new Response(await resp.text(), { status: resp.status, headers: { ...CORS, 'Content-Type': 'application/json' } })
      }

      if (path === '/sui') {
        const resp = await fetch('https://fullnode.testnet.sui.io/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        })
        return new Response(await resp.text(), { status: resp.status, headers: { ...CORS, 'Content-Type': 'application/json' } })
      }

      return new Response(JSON.stringify({ error: 'not found', path }), {
        status: 404, headers: { ...CORS, 'Content-Type': 'application/json' }
      })
    } catch(e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' }
      })
    }
  }
}
