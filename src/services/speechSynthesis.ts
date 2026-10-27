/**
 * High-fidelity Kannada speech synthesis utility.
 *
 * Routes speech through the dedicated Kannada audio streaming endpoint (/api/tts)
 * which strips punctuation (preventing "question mark" glitches) and streams
 * authentic native Kannada MP3 audio.
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

export function speakKannada(
  text: string,
  transliteration?: string,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (error: string) => void,
): boolean {
  // Strip all punctuation marks (? . , ! etc.) so audio engines never pronounce "question mark"
  const speechText = text.replace(/[?.,!¿¡;:()]/g, ' ').replace(/\s+/g, ' ').trim()
  if (!speechText) return false

  stopSpeaking()

  // 1. Primary: Use our local Vite /api/tts endpoint (fetches clean native Kannada MP3)
  try {
    const encoded = encodeURIComponent(speechText)
    const proxyUrl = `/api/tts?q=${encoded}`
    const directUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=kn&client=tw-ob&q=${encoded}`

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
        fallbackWebSpeech(speechText, transliteration, onStart, onEnd, onError)
      }

      fallbackAudio.play().catch(() => {
        fallbackWebSpeech(speechText, transliteration, onStart, onEnd, onError)
      })
    }

    const playPromise = audio.play()
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        if (!hasStarted) {
          // If autoplay prevented or proxy errored, try direct
          audio.onerror?.(new Event('error'))
        }
      })
    }

    return true
  } catch {
    return fallbackWebSpeech(speechText, transliteration, onStart, onEnd, onError)
  }
}

function fallbackWebSpeech(
  speechText: string,
  transliteration?: string,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (error: string) => void,
): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onError?.('Kannada audio voice is not available on this browser.')
    onEnd?.()
    return false
  }

  try {
    window.speechSynthesis.cancel()

    const voices = window.speechSynthesis.getVoices()
    const kannadaVoice = voices.find(
      (v) =>
        v.lang.toLowerCase().includes('kn') ||
        v.name.toLowerCase().includes('kannada'),
    )

    // If no Kannada voice exists on this OS (common on Mac/Windows),
    // speak the phonetic Roman transliteration (e.g. "En maadtidiya")
    // so it pronounces the Kannada words correctly instead of saying "question mark"!
    const textToSpeak = kannadaVoice
      ? speechText
      : (transliteration?.replace(/[?.,!¿¡;:()]/g, ' ').trim() || speechText)

    const utterance = new SpeechSynthesisUtterance(textToSpeak)
    if (kannadaVoice) {
      utterance.voice = kannadaVoice
      utterance.lang = 'kn-IN'
    } else {
      utterance.lang = 'en-IN'
      utterance.rate = 0.85
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
