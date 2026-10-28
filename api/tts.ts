import type { IncomingMessage, ServerResponse } from 'node:http'

const MAX_TTS_BODY = 50 * 1024 // 50 KB limit

function sendJson(res: ServerResponse | any, statusCode: number, payload: unknown) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    res.status(statusCode).json(payload)
    return
  }
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

async function parseBodyIfPost(req: IncomingMessage | any): Promise<any> {
  if (req.method !== 'POST') return {}
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body)
      } catch {
        return {}
      }
    }
    return req.body
  }

  return new Promise((resolve) => {
    let raw = ''
    let size = 0
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_TTS_BODY) {
        req.destroy()
        resolve({})
        return
      }
      raw += chunk.toString()
    })
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {})
      } catch {
        resolve({})
      }
    })
    req.on('error', () => resolve({}))
  })
}

export default async function handler(req: IncomingMessage | any, res: ServerResponse | any) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    sendJson(res, 405, { error: 'Method Not Allowed. Only GET and POST are accepted.' })
    return
  }

  const url = new URL(req.url || '', 'http://localhost')
  const queryQ = url.searchParams.get('q') || (req.query?.q as string) || ''
  const queryLang = url.searchParams.get('lang') || (req.query?.lang as string) || ''

  let postBody: any = {}
  if (req.method === 'POST') {
    postBody = await parseBodyIfPost(req)
  }

  const rawText = queryQ || postBody.q || postBody.text || ''
  const requestedLang = queryLang || postBody.lang || 'kn'
  const allowedLangs = ['kn', 'en', 'hi']
  const lang = allowedLangs.includes(requestedLang) ? requestedLang : 'kn'

  if (!rawText || !rawText.trim()) {
    sendJson(res, 400, { error: 'No text was provided for text-to-speech.' })
    return
  }

  // Strip punctuation symbols so speech engine never reads "question mark"
  const cleanText = rawText.replace(/[?.,!¿¡;:()]/g, ' ').trim()
  if (!cleanText) {
    sendJson(res, 400, { error: 'Text contains only punctuation symbols.' })
    return
  }

  const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodeURIComponent(cleanText)}`

  try {
    const googleRes = await fetch(googleTtsUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    })

    if (!googleRes.ok) {
      res.statusCode = googleRes.status
      res.end('TTS audio fetch failed')
      return
    }

    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Cache-Control', 'public, max-age=86400')
    const arrayBuffer = await googleRes.arrayBuffer()
    res.end(Buffer.from(arrayBuffer))
  } catch (err: unknown) {
    res.statusCode = 500
    res.end(String(err))
  }
}
