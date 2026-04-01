module.exports = async function handler(req, res) {
  const SHINAMI_KEY = process.env.VITE_SHINAMI_KEY
  if (!SHINAMI_KEY) return res.status(500).json({ error: 'Shinami key not configured' })

  try {
    let body = req.body
    if (typeof body === 'string') {
      try { body = JSON.parse(body) } catch {}
    }

    const response = await fetch('https://api.us1.shinami.com/gas/v1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': SHINAMI_KEY,
      },
      body: JSON.stringify(body),
    })

    const text = await response.text()
    let data
    try { data = JSON.parse(text) } catch { data = { error: text } }

    res.setHeader('Access-Control-Allow-Origin', '*')
    return res.status(response.status).json(data)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
