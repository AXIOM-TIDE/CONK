import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const SHINAMI_KEY = process.env.VITE_SHINAMI_KEY
  if (!SHINAMI_KEY) return res.status(500).json({ error: 'Shinami key not configured' })

  try {
    const response = await fetch('https://api.us1.shinami.com/zklogin/v1/prove', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': SHINAMI_KEY,
      },
      body: JSON.stringify(req.body),
    })

    const data = await response.json()

    if (!response.ok) {
      return res.status(response.status).json(data)
    }

    res.setHeader('Access-Control-Allow-Origin', '*')
    return res.status(200).json(data)
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
}
