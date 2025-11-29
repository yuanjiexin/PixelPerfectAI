import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

dotenv.config({ path: '.env.local' })

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))

const cleanBase64 = (dataUrl) => {
  const idx = dataUrl.indexOf(',')
  return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl
}

const sanitize = (v) => (v ? String(v).trim().replace(/^['"`]+|['"`]+$/g, '') : undefined)
const clamp1000 = (n) => {
  const v = Number(n)
  if (!isFinite(v)) return undefined
  const scaled = v <= 1 ? v * 1000 : v
  return Math.max(0, Math.min(1000, Math.round(scaled)))
}
const normalizeIssue = (issue) => {
  const i = { ...issue }
  let b
  if (Array.isArray(i.box_2d) && i.box_2d.length === 4) {
    b = i.box_2d
  } else if (Array.isArray(i.bbox) && i.bbox.length === 4) {
    b = i.bbox
  } else if (i.bounding_box && typeof i.bounding_box === 'object') {
    const { ymin, xmin, ymax, xmax } = i.bounding_box
    b = [ymin, xmin, ymax, xmax]
  } else if (i.rect && typeof i.rect === 'object') {
    const { x, y, width, height } = i.rect
    b = [y, x, y + height, x + width]
  }
  if (b) {
    const c = b.map(clamp1000)
    if (c.every((v) => typeof v === 'number')) i.box_2d = c
  }
  return i
}

const healthHandler = (req, res) => {
  const hasKey = Boolean(process.env.DASHSCOPE_API_KEY || process.env.VITE_DASHSCOPE_API_KEY)
  const endpoint = sanitize(process.env.DASHSCOPE_ENDPOINT || process.env.VITE_DASHSCOPE_ENDPOINT)
  const model = sanitize(process.env.DASHSCOPE_MODEL || process.env.VITE_DASHSCOPE_MODEL)
  const workspace = sanitize(process.env.DASHSCOPE_WORKSPACE || process.env.VITE_DASHSCOPE_WORKSPACE)
  res.json({ hasKey, endpoint: endpoint || null, model: model || null, workspace: workspace || null })
}
app.get('/health', healthHandler)
app.get('/api/health', healthHandler)

const analyzeHandler = async (req, res) => {
  try {
    const apiKey = sanitize(process.env.DASHSCOPE_API_KEY || process.env.VITE_DASHSCOPE_API_KEY)
    if (!apiKey) return res.status(500).json({ error: { message: 'DASHSCOPE_API_KEY missing' } })

    const { designImageBase64, devImageBase64, systemInstruction } = req.body || {}
    if (!designImageBase64 || !devImageBase64) return res.status(400).json({ error: { message: 'Missing images' } })

    const preferred = sanitize(process.env.DASHSCOPE_MODEL || process.env.VITE_DASHSCOPE_MODEL) || 'qwen-vl-max'
    const candidates = Array.from(new Set([
      preferred,
      'qwen-vl-max',
      'qwen-vl-max-latest',
      'qwen3-vl-32b-thinking',
      'qwen3-vl-32b-instruct',
      'qwen3-vl-30b-a3b-thinking',
      'qwen3-vl-30b-a3b-instruct',
      'qwen3-vl-8b-thinking'
    ]))
    const base1 = sanitize(process.env.DASHSCOPE_ENDPOINT || process.env.VITE_DASHSCOPE_ENDPOINT) || 'https://dashscope.aliyuncs.com'
    const workspace = sanitize(process.env.DASHSCOPE_WORKSPACE || process.env.VITE_DASHSCOPE_WORKSPACE)
    const endpoints = [
      base1 + '/compatible-mode/v1/chat/completions',
      'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions'
    ]

    for (const endpoint of endpoints) {
      for (const model of candidates) {
        const payload = {
          model,
          messages: [
            { role: 'system', content: [{ type: 'text', text: String(systemInstruction || '') + '\n严格按 JSON 输出，字段为 {summary, issues[]}' }] },
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Design Mockup (Target):' },
                { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${cleanBase64(designImageBase64)}` } },
                { type: 'text', text: 'Development Screenshot (Implementation):' },
                { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${cleanBase64(devImageBase64)}` } },
                { type: 'text', text: 'Compare and find visual discrepancies. Return result in Chinese and strictly JSON.' }
              ]
            }
          ],
          response_format: { type: 'json_object' }
        }

        const controller = new AbortController()
        const timeoutMs = Number(process.env.DASHSCOPE_TIMEOUT_MS || 20000)
        const timer = setTimeout(() => controller.abort(), timeoutMs)
        let text = ''
        try {
          const resDash = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
              'X-DashScope-API-Key': apiKey,
              ...(workspace ? { 'X-DashScope-Workspace': workspace } : {})
            },
            body: JSON.stringify(payload),
            signal: controller.signal
          })
          text = await resDash.text()
          clearTimeout(timer)

          if (!resDash.ok) {
            let code = ''
            let type = ''
            let message = ''
            try {
              const j = JSON.parse(text)
              code = j?.error?.code || ''
              type = j?.error?.type || ''
              message = j?.error?.message || ''
            } catch {}
            if (/^\s*<html/i.test(text)) continue
            if (code === 'model_not_found') continue
            return res.status(resDash.status).json({ error: { code, type, message: message || 'DashScope request failed', endpoint, model }, raw: text })
          }

          const data = JSON.parse(text)
          const content = data?.choices?.[0]?.message?.content
          if (!content || typeof content !== 'string') continue
          const result = JSON.parse(content)
          result.issues = Array.isArray(result.issues) ? result.issues.map(normalizeIssue) : []
          return res.json(result)
        } catch (e) {
          clearTimeout(timer)
          continue
        }
      }
    }

    return res.status(502).json({ error: { message: 'All candidate models/ endpoints failed.' } })
  } catch (e) {
    return res.status(500).json({ error: { message: String(e?.message || e) } })
  }
}
app.post('/analyze', analyzeHandler)
app.post('/api/analyze', analyzeHandler)

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distPath = path.resolve(__dirname, '..', 'dist')

app.use(express.static(distPath))
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

const port = Number(process.env.PORT || 3000)
app.listen(port, () => {
  console.log(`Server listening on http://0.0.0.0:${port}`)
})
