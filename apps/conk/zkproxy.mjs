import http from 'http'
import https from 'https'

const SHINAMI_KEY = 'us1_sui_testnet_a1a53851661244fa9c395338586d2ba3'

function proxyTo(path, body, res) {
  const options = {
    hostname: 'api.us1.shinami.com',
    path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': SHINAMI_KEY,
      'Content-Length': Buffer.byteLength(body),
    }
  }
  const r = https.request(options, (sr) => {
    let data = ''
    sr.on('data', c => data += c)
    sr.on('end', () => {
      console.log(path, 'status:', sr.statusCode)
      console.log('response:', data.slice(0, 200))
      res.writeHead(sr.statusCode, { 'Content-Type': 'application/json' })
      res.end(data)
    })
  })
  r.on('error', e => { res.writeHead(500); res.end(JSON.stringify({ error: e.message })) })
  r.write(body)
  r.end()
}

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return }

  let body = ''
  req.on('data', chunk => body += chunk)
  req.on('end', () => {
    console.log('REQUEST URL:', req.url)
    console.log('REQUEST BODY preview:', body.slice(0,500))
    console.log('REQUEST BODY:', body.slice(0, 300))
    console.log('REQUEST URL:', req.url)
    console.log('REQUEST BODY:', body.slice(0, 300))
    if (req.url === '/zkproof') {
      proxyTo('/sui/zkprover/v1', body, res)
    } else if (req.url === '/gas') {
      proxyTo('/sui/gas/v1', body, res)
    } else {
      res.writeHead(404); res.end('not found')
    }
  })
}).listen(3001, () => console.log('zkproxy running on 3001'))
