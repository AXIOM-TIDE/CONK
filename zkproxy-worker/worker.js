const SHINAMI_KEY = 'us1_sui_testnet_a1a53851661244fa9c395338586d2ba3'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS })
    }

    const url = new URL(request.url)
    const body = await request.text()

    if (url.pathname === '/health') {
      return new Response('ok', { headers: CORS })
    }

    if (url.pathname === '/api/zkproof') {
      const resp = await fetch('https://api.us1.shinami.com/zklogin/v1/prove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': SHINAMI_KEY },
        body,
      })
      const data = await resp.text()
      return new Response(data, { status: resp.status, headers: { ...CORS, 'Content-Type': 'application/json' } })
    }

    if (url.pathname === '/api/gas') {
      const resp = await fetch('https://api.us1.shinami.com/gas/v1/gas_sponsorTransactionBlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': SHINAMI_KEY },
        body,
      })
      const data = await resp.text()
      return new Response(data, { status: resp.status, headers: { ...CORS, 'Content-Type': 'application/json' } })
    }

    if (url.pathname === '/api/sui') {
      const resp = await fetch('https://fullnode.testnet.sui.io/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      })
      const data = await resp.text()
      return new Response(data, { status: resp.status, headers: { ...CORS, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: 'not found', path: url.pathname }), {
      status: 404,
      headers: { ...CORS, 'Content-Type': 'application/json' }
    })
  }
}
