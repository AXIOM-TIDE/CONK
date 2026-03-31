import type { VercelRequest, VercelResponse } from '@vercel/node'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const SHINAMI_KEY = process.env.VITE_SHINAMI_KEY
  if (!SHINAMI_KEY) return res.status(500).json({ error: 'Shinami key not configured' })

  try {
    let body = req.body
    if (typeof body === 'string') {
      try { body = JSON.parse(body) } catch {}
    }

    console.log('zkproof body:', JSON.stringify(body).slice(0, 200))

    const response = await fetch('https://api.us1.shinami.com/zklogin/v1/prove', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': SHINAMI_KEY,
      },
      body: JSON.stringify(body),
    })

    const text = await response.text()
    console.log('Shinami response:', text.slice(0, 200))

    let data
    try { data = JSON.parse(text) } catch { data = { error: text } }

    if (!response.ok) {
      return res.status(response.status).json(data)
    }

    res.setHeader('Access-Control-Allow-Origin', '*')
    return res.status(200).json(data)
  } catch (e: any) {
    console.error('zkproof error:', e.message)
    return res.status(500).json({ error: e.message })
  }
}
