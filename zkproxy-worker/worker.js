const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
}

export default {
  async fetch(request, env) {
    try {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: CORS })
      }

      const path = new URL(request.url).pathname
      const body = await request.text()
      const SHINAMI_KEY = env.SHINAMI_KEY || 'us1_sui_testnet_a1a53851661244fa9c395338586d2ba3'

      console.log('HIT:', path, 'KEY:', SHINAMI_KEY ? 'present' : 'missing')

      if (path === '/health') return new Response('ok', { headers: CORS })

      if (path.includes('zkproof')) {
        console.log('Calling Shinami zkproof...')
        const resp = await fetch('https://api.us1.shinami.com/sui/zkprover/v1', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-Key': SHINAMI_KEY },
          body,
        })
        console.log('Shinami status:', resp.status)
        const text = await resp.text()
        console.log('Shinami body:', text.slice(0, 200))
        return new Response(text, { status: resp.status, headers: { ...CORS, 'Content-Type': 'application/json' } })
      }

      if (path.includes('gas')) {
        const resp = await fetch('https://api.us1.shinami.com/sui/gas/v1', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-Key': SHINAMI_KEY },
          body,
        })
        const text = await resp.text()
        return new Response(text, { status: resp.status, headers: { ...CORS, 'Content-Type': 'application/json' } })
      }

      if (path.includes('sui')) {
        const resp = await fetch('https://fullnode.testnet.sui.io/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        })
        const text = await resp.text()
        return new Response(text, { status: resp.status, headers: { ...CORS, 'Content-Type': 'application/json' } })
      }

      return new Response(JSON.stringify({ error: 'not found', path }), {
        status: 404, headers: { ...CORS, 'Content-Type': 'application/json' }
      })
    } catch(e) {
      console.error('ERROR:', e.message, e.stack)
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' }
      })
    }
  }
}
