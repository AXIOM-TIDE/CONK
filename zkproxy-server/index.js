import http from 'http'
import https from 'https'

const SHINAMI_KEY = process.env.SHINAMI_KEY || 'us1_sui_testnet_a1a53851661244fa9c395338586d2ba3'
const PORT = process.env.PORT || 3001

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key, Authorization')
  res.setHeader('Access-Control-Max-Age', '86400')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  let body = ''
  req.on('data', c => body += c)
  req.on('end', () => {
    const isZkproof = req.url === '/api/zkproof'
    const path = isZkproof ? '/zklogin/v1/prove' : '/gas/v1'

    const r = https.request({
      hostname: 'api.us1.shinami.com',
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': SHINAMI_KEY,
        'Content-Length': Buffer.byteLength(body),
      }
    }, sr => {
      let data = ''
      sr.on('data', c => data += c)
      sr.on('end', () => {
        res.writeHead(sr.statusCode, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        })
        res.end(data)
      })
    })
    r.on('error', e => {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: e.message }))
    })
    r.write(body)
    r.end()
  })
}).listen(PORT, () => console.log(`zkproxy running on ${PORT}`))
