import type { IncomingMessage, ServerResponse } from 'node:http'

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite'
const MAX_BODY_SIZE = 100 * 1024 // 100 KB limit for text translation

export class GeminiApiError extends Error {
  statusCode: number
  constructor(message: string, statusCode: number) {
    super(message)
    this.statusCode = statusCode
  }
}

function sendJson(res: ServerResponse | any, statusCode: number, payload: unknown) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    res.status(statusCode).json(payload)
    return
  }
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

function buildPrompt(text: string, sourceLanguage: string, targetLanguage: string): string {
  if (sourceLanguage.toLowerCase() === 'kannada') {
    return `You are a translator for NammaConnect, an app helping people read and communicate in Karnataka.
Translate the following Kannada text into clear, natural everyday ${targetLanguage}.
If translating to Hindi, provide standard conversational Hindi (with Roman transliteration).
If translating to English, provide natural English.

Source text in Kannada: "${text}"

Respond ONLY with a valid JSON object matching this schema, without any markdown formatting or extra commentary:
{
  "translation": "Translated text in ${targetLanguage}",
  "kannada": "${text.replace(/"/g, '\\"')}",
  "transliteration": "Phonetic pronunciation guide of the Kannada text in English alphabet"
}`
  }

  return `You are a translator for NammaConnect, an app helping people communicate in Karnataka.
Translate the following ${sourceLanguage} text into natural, everyday spoken Kannada (as commonly spoken in Bengaluru/Karnataka).
The input text might be in English, Hindi (in Devanagari or Romanized/Hinglish like "kya kar rahe ho"), or Kannada.
Always translate it into authentic, conversational spoken Kannada that locals use in everyday life.
Do not produce overly archaic or textbook Kannada; make it friendly, natural, and accurate.
Also provide the English transliteration (phonetic pronunciation in Roman script) so a learner can pronounce it clearly.

Source text: "${text}"

Respond ONLY with a valid JSON object matching this schema, without any markdown formatting or extra commentary:
{
  "kannada": "Kannada translation in Kannada script",
  "transliteration": "Phonetic pronunciation in English letters"
}`
}

async function translateWithGemini(
  text: string,
  sourceLanguage: string,
  apiKey: string,
  targetLanguage: string = 'Kannada',
): Promise<{ kannada: string; transliteration?: string; translation?: string }> {
  const prompt = buildPrompt(text, sourceLanguage, targetLanguage)

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      }),
    },
  )

  if (!response.ok) {
    const errorData = (await response.json().catch(() => null)) as {
      error?: { message?: string }
    } | null
    const errorMsg =
      errorData?.error?.message || `Translation failed with status ${response.status}`
    throw new GeminiApiError(errorMsg, response.status)
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''

  if (!rawText) {
    throw new GeminiApiError('No translation was generated.', 502)
  }

  // Clean JSON if enclosed in markdown code fences
  const cleaned = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim()

  try {
    const parsed = JSON.parse(cleaned) as {
      kannada?: string
      transliteration?: string
      translation?: string
    }
    return {
      kannada: parsed.kannada || (sourceLanguage.toLowerCase() === 'kannada' ? text : rawText),
      transliteration: parsed.transliteration,
      translation: parsed.translation || parsed.kannada || rawText,
    }
  } catch {
    return {
      kannada: sourceLanguage.toLowerCase() === 'kannada' ? text : rawText,
      translation: rawText,
    }
  }
}

async function parseJsonBody(req: IncomingMessage | any): Promise<{ body: any; error?: string; statusCode?: number }> {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') {
      if (Buffer.byteLength(req.body) > MAX_BODY_SIZE) {
        return { body: null, error: 'Payload exceeds maximum limit (100KB).', statusCode: 413 }
      }
      try {
        return { body: JSON.parse(req.body) }
      } catch {
        return { body: null, error: 'The translation request was not valid JSON.', statusCode: 400 }
      }
    }
    return { body: req.body }
  }

  return new Promise((resolve) => {
    let rawBody = ''
    let size = 0

    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_BODY_SIZE) {
        resolve({ body: null, error: 'Payload exceeds maximum limit (100KB).', statusCode: 413 })
        req.destroy()
        return
      }
      rawBody += chunk.toString()
    })

    req.on('end', () => {
      if (!rawBody.trim()) {
        resolve({ body: {} })
        return
      }
      try {
        resolve({ body: JSON.parse(rawBody) })
      } catch {
        resolve({ body: null, error: 'The translation request was not valid JSON.', statusCode: 400 })
      }
    })

    req.on('error', (err: unknown) => {
      resolve({ body: null, error: String(err), statusCode: 500 })
    })
  })
}

export default async function handler(req: IncomingMessage | any, res: ServerResponse | any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    sendJson(res, 405, { error: 'Method Not Allowed. Only POST is accepted.' })
    return
  }

  const { body, error: parseError, statusCode: parseStatus } = await parseJsonBody(req)
  if (parseError) {
    sendJson(res, parseStatus || 400, { error: parseError })
    return
  }

  let text = ''
  let sourceLanguage = 'English'
  let targetLanguage = 'Kannada'

  if (body) {
    if (typeof body.text === 'string') text = body.text
    if (typeof body.sourceLanguage === 'string') sourceLanguage = body.sourceLanguage
    if (typeof body.targetLanguage === 'string') targetLanguage = body.targetLanguage
  }

  if (!text.trim()) {
    sendJson(res, 400, { error: 'No text was provided to translate.' })
    return
  }

  if (text.length > 2000) {
    sendJson(res, 400, { error: 'The text is too long to translate (max 2000 characters).' })
    return
  }

  const geminiApiKey = process.env.GEMINI_API_KEY || ''
  if (!geminiApiKey.trim()) {
    sendJson(res, 503, {
      error:
        'Gemini API key is not configured on the server. Set GEMINI_API_KEY in your .env file (server-side, no VITE_ prefix).',
    })
    return
  }

  try {
    const result = await translateWithGemini(text, sourceLanguage, geminiApiKey, targetLanguage)
    sendJson(res, 200, result)
  } catch (err: unknown) {
    if (err instanceof GeminiApiError) {
      sendJson(res, err.statusCode, { error: err.message })
    } else {
      sendJson(res, 500, {
        error: 'Translation failed due to a network or server error. Please try again.',
      })
    }
  }
}
