import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin, type Connect } from 'vite'
import tailwindcss from '@tailwindcss/vite'

const GEMINI_MODEL = 'gemini-3.5-flash-lite'

function kannadaTtsPlugin(): Plugin {
  const handleTts: Connect.NextHandleFunction = (req, res, next) => {
    const url = new URL(req.url || '', 'http://localhost')
    const text = url.searchParams.get('q')

    if (!text || !text.trim()) {
      next()
      return
    }

    // Strip punctuation symbols so speech engine never reads "question mark"
    const cleanText = text.replace(/[?.,!¿¡;:()]/g, ' ').trim()
    const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=kn&client=tw-ob&q=${encodeURIComponent(cleanText)}`

    fetch(googleTtsUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    })
      .then(async (googleRes) => {
        if (!googleRes.ok) {
          res.statusCode = googleRes.status
          res.end('TTS audio fetch failed')
          return
        }

        res.setHeader('Content-Type', 'audio/mpeg')
        res.setHeader('Cache-Control', 'public, max-age=86400')
        const arrayBuffer = await googleRes.arrayBuffer()
        res.end(Buffer.from(arrayBuffer))
      })
      .catch((err: unknown) => {
        res.statusCode = 500
        res.end(String(err))
      })
  }

  return {
    name: 'kannada-tts-plugin',
    configureServer(server) {
      server.middlewares.use('/api/tts', handleTts)
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/tts', handleTts)
    },
  }
}

/**
 * Smart Conversation Rescue — server-side translation endpoint.
 *
 * Keeps the Gemini API key strictly on the server: the key is read from
 * GEMINI_API_KEY (no VITE_ prefix, so Vite never exposes it to the client
 * bundle) and the browser only ever talks to POST /api/translate.
 */
function kannadaTranslatePlugin(geminiApiKey: string): Plugin {
  const handleTranslate: Connect.NextHandleFunction = (req, res) => {
    let rawBody = ''
    req.on('data', (chunk: Buffer) => {
      rawBody += chunk
    })

    req.on('end', async () => {
      const respond = (statusCode: number, payload: unknown) => {
        res.statusCode = statusCode
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(payload))
      }

      let text = ''
      let sourceLanguage = 'English'
      try {
        const parsed = JSON.parse(rawBody) as {
          text?: string
          sourceLanguage?: string
        }
        text = typeof parsed.text === 'string' ? parsed.text : ''
        if (typeof parsed.sourceLanguage === 'string') {
          sourceLanguage = parsed.sourceLanguage
        }
      } catch {
        respond(400, { error: 'The translation request was not valid JSON.' })
        return
      }

      if (!text.trim()) {
        respond(400, { error: 'No text was provided to translate.' })
        return
      }
      if (text.length > 2000) {
        respond(400, { error: 'The text is too long to translate (max 2000 characters).' })
        return
      }
      if (!geminiApiKey.trim()) {
        respond(
          503,
          {
            error:
              'Gemini API key is not configured on the server. Set GEMINI_API_KEY in your .env file (server-side, no VITE_ prefix).',
          },
        )
        return
      }

      try {
        const result = await translateWithGemini(text, sourceLanguage, geminiApiKey)
        respond(200, result)
      } catch (err: unknown) {
        if (err instanceof GeminiApiError) {
          respond(err.statusCode, { error: err.message })
        } else {
          respond(500, {
            error: 'Translation failed due to a network or server error. Please try again.',
          })
        }
      }
    })
  }

  return {
    name: 'kannada-translate-plugin',
    configureServer(server) {
      server.middlewares.use('/api/translate', handleTranslate)
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/translate', handleTranslate)
    },
  }
}

export class GeminiApiError extends Error {
  statusCode: number
  constructor(message: string, statusCode: number) {
    super(message)
    this.statusCode = statusCode
  }
}

function buildKannadaPrompt(text: string, sourceLanguage: string): string {
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
): Promise<{ kannada: string; transliteration?: string }> {
  const prompt = buildKannadaPrompt(text, sourceLanguage)

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
    const parsed = JSON.parse(cleaned) as { kannada?: string; transliteration?: string }
    return {
      kannada: parsed.kannada || rawText,
      transliteration: parsed.transliteration,
    }
  } catch {
    // Fallback if model output isn't strict JSON
    return {
      kannada: rawText,
    }
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Server-only key: GEMINI_API_KEY (no VITE_ prefix, so it is never
  // baked into the client bundle). process.env takes precedence so the
  // key can be supplied from the deployment environment directly.
  const env = loadEnv(mode, process.cwd(), '')
  const geminiApiKey = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY || ''

  return {
    plugins: [
      react(),
      tailwindcss(),
      kannadaTtsPlugin(),
      kannadaTranslatePlugin(geminiApiKey),
    ],
  }
})
