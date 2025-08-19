import { translate } from '@vitalets/google-translate-api'

// simple in-memory cache (note: resets on Vercel cold start)
const cache = new Map()

export default async function handler(req, res) {
  // ✅ CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // ✅ Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const { texts, targetLang } = req.body // texts = array
    if (!texts || !Array.isArray(texts)) {
      return res.status(400).json({ error: 'texts must be an array' })
    }

    const results = []
    const delimiter = '|||'
    const uncachedTexts = []
    const uncachedIndexes = []

    // check cache first
    texts.forEach((t, i) => {
      const key = `${targetLang}:${t}`
      if (cache.has(key)) {
        results[i] = cache.get(key)
      } else {
        uncachedTexts.push(t)
        uncachedIndexes.push(i)
      }
    })

    if (uncachedTexts.length > 0) {
      const joined = uncachedTexts.join(delimiter)
      const translated = await translate(joined, { to: targetLang })
      const splitted = translated.text.split(delimiter)

      splitted.forEach((tr, idx) => {
        const text = uncachedTexts[idx]
        const key = `${targetLang}:${text}`
        cache.set(key, tr)
        results[uncachedIndexes[idx]] = tr
      })
    }

    res.status(200).json({ translations: results })
  } catch (err) {
    console.error('Translation error:', err)
    res.status(500).json({ error: err.message })
  }
}
