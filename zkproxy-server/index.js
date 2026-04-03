import http from 'http'
import https from 'https'

const SHINAMI_KEY = process.env.SHINAMI_KEY || 'us1_sui_testnet_a1a53851661244fa9c395338586d2ba3'
const PORT = process.env.PORT || 3001

function setCORS(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key, Authorization, client-sdk-version, client-target-api-version')
  res.setHeader('Access-Control-Max-Age', '86400')
}

function proxyRequest(options, body, res) {
  const r = https.request(options, sr => {
    let data = ''
    sr.on('data', c => data += c)
    sr.on('end', () => {
      setCORS(res)
      res.writeHead(sr.statusCode, { 'Content-Type': 'application/json' })
      res.end(data)
    })
  })
  r.on('error', e => {
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: e.message }))
  })
  r.write(body)
  r.end()
}

http.createServer((req, res) => {
  setCORS(res)

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.url === '/health') {
    res.writeHead(200)
    res.end('ok')
    return
  }

  let body = ''
  req.on('data', c => body += c)
  req.on('end', () => {

    if (req.url === '/api/zkproof') {
      proxyRequest({
        hostname: 'api.us1.shinami.com',
        path: '/zklogin/v1/prove',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': SHINAMI_KEY,
          'Content-Length': Buffer.byteLength(body),
        }
      }, body, res)

    } else if (req.url === '/api/gas') {
      proxyRequest({
        hostname: 'api.us1.shinami.com',
        path: '/gas/v1/gas_sponsorTransactionBlock',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': SHINAMI_KEY,
          'Content-Length': Buffer.byteLength(body),
        }
      }, body, res)

    } else if (req.url === '/api/sui') {
      proxyRequest({
        hostname: 'fullnode.testnet.sui.io',
        path: '/',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        }
      }, body, res)

    } else {
      res.writeHead(404)
      res.end('not found')
    }
  })
}).listen(PORT, () => console.log(`zkproxy running on ${PORT}`))
