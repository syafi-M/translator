// server/server.js
import express from 'express'
import cors from 'cors'
import { translate } from '@vitalets/google-translate-api'

const app = express()
app.use(cors())
app.use(express.json())

// Cache biar gak translate teks yang sama berulang
const cache = new Map()

app.post('/translate', async (req, res) => {
  try {
    const { texts, targetLang } = req.body // texts = array
    if (!texts || !Array.isArray(texts)) {
      return res.status(400).json({ error: 'texts must be an array' })
    }

    const results = []

    // gabung teks jadi 1 request (hemat quota Google)
    const delimiter = '|||'
    const uncachedTexts = []
    const uncachedIndexes = []

    // cek cache dulu
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

    res.json({ translations: results })
  } catch (err) {
    console.error('Translation error:', err)
    res.status(500).json({ error: err.message })
  }
})

app.listen(5000, () => {
  console.log('✅ Translation server running at http://localhost:3001')
})
