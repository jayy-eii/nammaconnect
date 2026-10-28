/**
 * Speech synthesis utility for NammaConnect.
 *
 * Supports Kannada, English, and Hindi text-to-speech.
 * Routes speech through the local /api/tts endpoint with automatic fallback
 * to direct TTS and native browser SpeechSynthesisUtterance.
 */

let currentAudio: HTMLAudioElement | null = null

export function stopSpeaking(): void {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.currentTime = 0
    currentAudio = null
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel()
    } catch {
      // ignore
    }
  }
}

export type SupportedTtsLang = 'kn' | 'en' | 'hi'

export function speakText(
  text: string,
  lang: SupportedTtsLang = 'kn',
  transliteration?: string,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (error: string) => void,
): boolean {
  // Strip punctuation marks (? . , ! etc.) so audio engines never pronounce "question mark"
  const speechText = text.replace(/[?.,!¿¡;:()]/g, ' ').replace(/\s+/g, ' ').trim()
  if (!speechText) return false

  stopSpeaking()

  // 1. Primary: Use our local Vite /api/tts endpoint
  try {
    const encoded = encodeURIComponent(speechText)
    const proxyUrl = `/api/tts?q=${encoded}&lang=${lang}`
    const directUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encoded}`

    const audio = new Audio(proxyUrl)
    currentAudio = audio

    let hasStarted = false

    audio.onplay = () => {
      hasStarted = true
      onStart?.()
    }

    audio.onended = () => {
      currentAudio = null
      onEnd?.()
    }

    audio.onerror = () => {
      // If /api/tts failed, try direct Google TTS
      const fallbackAudio = new Audio(directUrl)
      currentAudio = fallbackAudio

      fallbackAudio.onplay = () => {
        hasStarted = true
        onStart?.()
      }

      fallbackAudio.onended = () => {
        currentAudio = null
        onEnd?.()
      }

      fallbackAudio.onerror = () => {
        fallbackWebSpeech(speechText, lang, transliteration, onStart, onEnd, onError)
      }

      fallbackAudio.play().catch(() => {
        fallbackWebSpeech(speechText, lang, transliteration, onStart, onEnd, onError)
      })
    }

    const playPromise = audio.play()
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        if (!hasStarted) {
          audio.onerror?.(new Event('error'))
        }
      })
    }

    return true
  } catch {
    return fallbackWebSpeech(speechText, lang, transliteration, onStart, onEnd, onError)
  }
}

/**
 * Convenience wrapper for speaking Kannada text (backwards compatible).
 */
export function speakKannada(
  text: string,
  transliteration?: string,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (error: string) => void,
): boolean {
  return speakText(text, 'kn', transliteration, onStart, onEnd, onError)
}

function fallbackWebSpeech(
  speechText: string,
  lang: SupportedTtsLang,
  transliteration?: string,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (error: string) => void,
): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onError?.('Speech playback is not supported on this browser.')
    onEnd?.()
    return false
  }

  try {
    window.speechSynthesis.cancel()

    const voices = window.speechSynthesis.getVoices()
    const langPrefix = lang === 'hi' ? 'hi' : lang === 'en' ? 'en' : 'kn'
    const targetVoice = voices.find(
      (v) =>
        v.lang.toLowerCase().startsWith(langPrefix) ||
        v.name.toLowerCase().includes(lang === 'hi' ? 'hindi' : lang === 'en' ? 'english' : 'kannada'),
    )

    let textToSpeak = speechText
    if (lang === 'kn' && !targetVoice && transliteration) {
      // If Kannada voice isn't installed on the OS, pronounce the phonetic transliteration
      textToSpeak = transliteration.replace(/[?.,!¿¡;:()]/g, ' ').trim() || speechText
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak)
    if (targetVoice) {
      utterance.voice = targetVoice
      utterance.lang = targetVoice.lang
    } else {
      utterance.lang = lang === 'hi' ? 'hi-IN' : lang === 'en' ? 'en-IN' : 'kn-IN'
      if (lang === 'kn') {
        utterance.rate = 0.85
      }
    }

    utterance.onstart = () => {
      onStart?.()
    }

    utterance.onend = () => {
      onEnd?.()
    }

    utterance.onerror = (e) => {
      if (e.error !== 'canceled' && e.error !== 'interrupted') {
        onError?.('Speech playback failed.')
      }
      onEnd?.()
    }

    window.speechSynthesis.speak(utterance)
    return true
  } catch {
    onError?.('Speech playback failed.')
    onEnd?.()
    return false
  }
}
