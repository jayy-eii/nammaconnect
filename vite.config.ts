import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin, type Connect } from 'vite'
import tailwindcss from '@tailwindcss/vite'

const GEMINI_MODEL = 'gemini-3.5-flash-lite'

function kannadaTtsPlugin(): Plugin {
  const handleTts: Connect.NextHandleFunction = (req, res, next) => {
    const url = new URL(req.url || '', 'http://localhost')
    const text = url.searchParams.get('q')
    const requestedLang = url.searchParams.get('lang') || 'kn'
    const allowedLangs = ['kn', 'en', 'hi']
    const lang = allowedLangs.includes(requestedLang) ? requestedLang : 'kn'

    if (!text || !text.trim()) {
      next()
      return
    }

    // Strip punctuation symbols so speech engine never reads "question mark"
    const cleanText = text.replace(/[?.,!¿¡;:()]/g, ' ').trim()
    const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodeURIComponent(cleanText)}`

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
 * Server-side translation endpoint.
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
      let targetLanguage = 'Kannada'

      try {
        const parsed = JSON.parse(rawBody) as {
          text?: string
          sourceLanguage?: string
          targetLanguage?: string
        }
        text = typeof parsed.text === 'string' ? parsed.text : ''
        if (typeof parsed.sourceLanguage === 'string') {
          sourceLanguage = parsed.sourceLanguage
        }
        if (typeof parsed.targetLanguage === 'string') {
          targetLanguage = parsed.targetLanguage
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
        const result = await translateWithGemini(text, sourceLanguage, geminiApiKey, targetLanguage)
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

/**
 * Camera OCR & Translation Plugin.
 *
 * Receives base64 image data and calls Gemini multimodal vision model
 * to extract Kannada text, bounding boxes, and translate into English or Hindi.
 */
function cameraOcrPlugin(geminiApiKey: string): Plugin {
  const handleOcr: Connect.NextHandleFunction = (req, res, next) => {
    if (req.method !== 'POST') {
      next()
      return
    }

    let rawBody = ''
    let size = 0
    const MAX_SIZE = 12 * 1024 * 1024 // 12MB limit

    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_SIZE) {
        res.statusCode = 413
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'Image size exceeds maximum limit (10MB).' }))
        req.destroy()
        return
      }
      rawBody += chunk
    })

    req.on('end', async () => {
      if (res.writableEnded) return

      const respond = (statusCode: number, payload: unknown) => {
        res.statusCode = statusCode
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(payload))
      }

      let image = ''
      let targetLanguage = 'English'

      try {
        const parsed = JSON.parse(rawBody) as { image?: string; targetLanguage?: string }
        image = typeof parsed.image === 'string' ? parsed.image : ''
        if (typeof parsed.targetLanguage === 'string') {
          targetLanguage = parsed.targetLanguage
        }
      } catch {
        respond(400, { error: 'Invalid JSON request payload.' })
        return
      }

      if (!image) {
        respond(400, { error: 'No image provided. Please capture or upload a photo.' })
        return
      }

      if (!geminiApiKey.trim()) {
        respond(503, {
          error:
            'Gemini API key is not configured on the server. Set GEMINI_API_KEY in your .env file.',
        })
        return
      }

      // Extract base64 payload & mimeType
      let mimeType = 'image/jpeg'
      let base64Data = image
      const matches = image.match(/^data:([^;]+);base64,(.+)$/)
      if (matches) {
        mimeType = matches[1]
        base64Data = matches[2]
      }

      try {
        const result = await ocrAndTranslateWithGemini(
          base64Data,
          mimeType,
          targetLanguage,
          geminiApiKey,
        )
        respond(200, result)
      } catch (err: unknown) {
        if (err instanceof GeminiApiError) {
          respond(err.statusCode, { error: err.message })
        } else {
          respond(500, {
            error:
              err instanceof Error
                ? err.message
                : 'OCR processing failed due to a server error. Please try again.',
          })
        }
      }
    })
  }

  return {
    name: 'camera-ocr-plugin',
    configureServer(server) {
      server.middlewares.use('/api/ocr-translate', handleOcr)
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/ocr-translate', handleOcr)
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

async function ocrAndTranslateWithGemini(
  base64Data: string,
  mimeType: string,
  targetLanguage: string,
  apiKey: string,
): Promise<{
  detected: boolean
  quality: 'good' | 'poor' | 'blurry' | 'dark' | 'no_text'
  kannadaText?: string
  transliteration?: string
  translatedText?: string
  targetLanguage?: string
  blocks?: Array<{
    kannada: string
    translation: string
    box2d?: [number, number, number, number]
  }>
  error?: string
}> {
  const prompt = `You are the Camera OCR and Translation engine for NammaConnect, an app that helps people read and understand Kannada signs, boards, menus, notices, and street directions in Karnataka.

Analyze this image carefully:
1. Detect whether there is any Kannada script (ಕನ್ನಡ) or bilingual Kannada text in the image.
2. Evaluate the image quality: check if the text is readable, or if the photo is too blurry, dark, unreadable, or contains no text at all.
3. If no Kannada or relevant text is detected, or if the image is too blurry/dark to read with confidence:
   Respond with:
   {
     "detected": false,
     "quality": "no_text" | "blurry" | "dark" | "poor",
     "error": "A clear, helpful message explaining why text could not be read (e.g. 'No Kannada text was detected in this image. Please aim closer to signs or boards.' or 'The image is too blurry or dark to read clearly. Please hold steady and try with better lighting.')"
   }
4. If Kannada text is detected:
   - Extract the complete Kannada text as seen on the sign/document into "kannadaText".
   - Provide an accurate phonetic English transliteration in "transliteration" so learners know how to pronounce the Kannada words on the sign.
   - Translate the meaning into ${targetLanguage} (everyday conversational phrasing) in "translatedText".
   - For distinct text regions (lines, headings, shop titles, signs), identify each in the "blocks" array. For each block, provide:
     - "kannada": the text in Kannada
     - "translation": the translation in ${targetLanguage}
     - "box2d": normalized bounding box array [ymin, xmin, ymax, xmax] with integer values from 0 to 1000 representing the region on the image (where ymin=top, xmin=left, ymax=bottom, xmax=right).
   
   Respond ONLY with a valid JSON object matching this schema, without any markdown formatting or code fences:
   {
     "detected": true,
     "quality": "good",
     "kannadaText": "Extracted Kannada text",
     "transliteration": "Phonetic pronunciation guide",
     "translatedText": "Full translation in ${targetLanguage}",
     "targetLanguage": "${targetLanguage}",
     "blocks": [
       {
         "kannada": "text segment",
         "translation": "translated segment",
         "box2d": [100, 150, 250, 850]
       }
     ]
   }`

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
            parts: [
              {
                inlineData: {
                  mimeType: mimeType || 'image/jpeg',
                  data: base64Data,
                },
              },
              {
                text: prompt,
              },
            ],
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
      errorData?.error?.message || `OCR request failed with status ${response.status}`
    throw new GeminiApiError(errorMsg, response.status)
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''

  if (!rawText) {
    throw new GeminiApiError('No OCR output was generated by the model.', 502)
  }

  const cleaned = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim()

  try {
    const parsed = JSON.parse(cleaned)
    return parsed
  } catch {
    return {
      detected: true,
      quality: 'good',
      kannadaText: rawText,
      translatedText: rawText,
      targetLanguage,
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
      cameraOcrPlugin(geminiApiKey),
    ],
  }
})
