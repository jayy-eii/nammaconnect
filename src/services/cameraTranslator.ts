/**
 * Camera Translator Client Service.
 *
 * Communicates with the server-side /api/ocr-translate and /api/translate
 * endpoints to detect Kannada text in images, extract bounding boxes,
 * and translate into English or Hindi.
 */

export type TargetLanguage = 'English' | 'Hindi'

export interface OcrTextBlock {
  kannada: string
  translation: string
  box2d?: [number, number, number, number] // [ymin, xmin, ymax, xmax] normalized 0..1000
}

export interface CameraOcrResponse {
  detected: boolean
  quality?: 'good' | 'poor' | 'blurry' | 'dark' | 'no_text'
  kannadaText?: string
  transliteration?: string
  translatedText?: string
  targetLanguage?: TargetLanguage
  blocks?: OcrTextBlock[]
  error?: string
}

/**
 * Sends an image to the server for OCR detection and translation.
 */
export async function scanAndTranslateImage(
  imageDataUrl: string,
  targetLanguage: TargetLanguage = 'English',
): Promise<CameraOcrResponse> {
  let response: Response

  try {
    response = await fetch('/api/ocr-translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: imageDataUrl,
        targetLanguage,
      }),
    })
  } catch {
    throw new Error(
      'Could not connect to the OCR service. Please check your internet connection.',
    )
  }

  if (!response.ok) {
    let errorMessage = `OCR request failed with status ${response.status}`
    try {
      const errorJson = (await response.json()) as { error?: string }
      if (errorJson?.error) {
        errorMessage = errorJson.error
      }
    } catch {
      // keep fallback
    }
    throw new Error(errorMessage)
  }

  const data = (await response.json()) as CameraOcrResponse
  return data
}

/**
 * Re-translates user-edited Kannada text into the chosen target language.
 */
export async function retranslateKannada(
  text: string,
  targetLanguage: TargetLanguage = 'English',
): Promise<{ translation: string; transliteration?: string }> {
  let response: Response

  try {
    response = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        sourceLanguage: 'Kannada',
        targetLanguage,
      }),
    })
  } catch {
    throw new Error(
      'Could not reach the translation service. Please check your network and try again.',
    )
  }

  if (!response.ok) {
    let errorMsg = `Translation failed with status ${response.status}`
    try {
      const errJson = (await response.json()) as { error?: string }
      if (errJson?.error) errorMsg = errJson.error
    } catch {
      // fallback
    }
    throw new Error(errorMsg)
  }

  const data = (await response.json()) as {
    translation?: string
    transliteration?: string
    kannada?: string
  }

  if (!data?.translation && !data?.kannada) {
    throw new Error('No translation was returned.')
  }

  return {
    translation: data.translation || data.kannada || '',
    transliteration: data.transliteration,
  }
}
