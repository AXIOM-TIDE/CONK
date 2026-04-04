import http from 'http'
import https from 'https'

const SHINAMI_KEY = process.env.SHINAMI_KEY || 'us1_sui_testnet_a1a53851661244fa9c395338586d2ba3'
const PORT = process.env.PORT || 3001

function setCORS(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', '*')
  res.setHeader('Access-Control-Max-Age', '86400')
}

function proxyRequest(hostname, path, extraHeaders, body, res) {
  const headers = {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    ...extraHeaders
  }
  const r = https.request({ hostname, path, method: 'POST', headers }, sr => {
    let data = ''
    sr.on('data', c => data += c)
    sr.on('end', () => {
      setCORS(res)
      res.writeHead(sr.statusCode, { 'Content-Type': 'application/json' })
      res.end(data)
    })
  })
  r.on('error', e => {
    console.error('Proxy error:', e.message)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: e.message }))
  })
  r.write(body)
  r.end()
}

http.createServer((req, res) => {
  setCORS(res)

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }
  if (req.url === '/health') { res.writeHead(200); res.end('ok'); return }

  let body = ''
  req.on('data', c => body += c)
  req.on('end', () => {
    console.log(`[${req.url}]`, body.slice(0, 100))

    if (req.url === '/api/zkproof') {
      proxyRequest('api.us1.shinami.com', '/zklogin/v1/prove',
        { 'X-API-Key': SHINAMI_KEY }, body, res)

    } else if (req.url === '/api/gas') {
      proxyRequest('api.us1.shinami.com', '/gas/v1/gas_sponsorTransactionBlock',
        { 'X-API-Key': SHINAMI_KEY }, body, res)

    } else if (req.url === '/api/sui') {
      proxyRequest('fullnode.testnet.sui.io', '/', {}, body, res)

    } else {
      res.writeHead(404); res.end('not found')
    }
  })
}).listen(PORT, '0.0.0.0', () => console.log(`zkproxy running on ${PORT}`))
// cache bust Sat Apr  4 04:58:19 UTC 2026
