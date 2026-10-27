export interface TranslationResult {
  kannada: string
  transliteration?: string
}

/**
 * Translates text into Kannada through the server-side /api/translate
 * endpoint. The Gemini API key lives only on the server (see
 * vite.config.ts) and is never exposed to the browser bundle.
 */
export async function translateToKannada(
  text: string,
  sourceLanguage: string = 'English',
): Promise<TranslationResult> {
  let response: Response
  try {
    response = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, sourceLanguage }),
    })
  } catch {
    throw new Error(
      'Could not reach the translation service. Please check your network and try again.',
    )
  }

  if (!response.ok) {
    let errorMsg = `Translation failed with status ${response.status}`
    try {
      const errorData = (await response.json()) as { error?: string }
      if (errorData?.error) errorMsg = errorData.error
    } catch {
      // keep the status-based message
    }
    throw new Error(errorMsg)
  }

  const data = (await response.json()) as {
    kannada?: string
    transliteration?: string
  }

  if (!data?.kannada) {
    throw new Error('No translation was generated.')
  }

  return {
    kannada: data.kannada,
    transliteration: data.transliteration,
  }
}
