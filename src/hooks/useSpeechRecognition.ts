import { useState, useRef, useEffect, useCallback } from 'react'
import type { SpeechAlternative } from '../lib/uncertaintyDetection'

interface SpeechRecognitionAlternativeLike {
  transcript: string
  /**
   * Real confidence (0–1) reported by the engine. Provided by
   * Chrome/Edge; may be missing in other browsers, in which case
   * it is exposed as undefined and never fabricated.
   */
  confidence?: number
}

interface SpeechRecognitionEventLike {
  resultIndex: number
  results: {
    length: number
    [index: number]: {
      isFinal: boolean
      /**
       * Number of alternative transcripts the engine considered.
       * May be absent — the code then treats it as exactly one.
       */
      length?: number
      [index: number]: SpeechRecognitionAlternativeLike | undefined
    }
  }
}

interface SpeechRecognitionErrorEventLike {
  error: string
  message?: string
}

interface SpeechRecognitionLike {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
}

interface UseSpeechRecognitionOptions {
  /**
   * Called for each final result with the accumulated transcript, the
   * engine-reported overall confidence (when the engine provides one),
   * and the alternative transcripts (if the engine reported multiple).
   */
  onFinalTranscript?: (
    transcript: string,
    confidence?: number,
    alternatives?: SpeechAlternative[],
  ) => void
  onTranscriptChange?: (transcript: string) => void
  onError?: (error: string) => void
}

export function useSpeechRecognition({
  onFinalTranscript,
  onTranscriptChange,
  onError,
}: UseSpeechRecognitionOptions = {}) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  /** Whether the engine delivered at least one final result this session. */
  const [hasFinalResult, setHasFinalResult] = useState(false)
  const hasFinalResultRef = useRef(false)
  const [isSupported] = useState(() => {
    if (typeof window === 'undefined') return false
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
  })
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    setIsListening(false)
  }, [])

  const startListening = useCallback(
    (sourceLanguage: string = 'English') => {
      hasFinalResultRef.current = false
      setHasFinalResult(false)
      if (typeof window === 'undefined') return

      const SpeechClass = window.SpeechRecognition || window.webkitSpeechRecognition
      if (!SpeechClass) {
        onError?.(
          'Voice recognition is not supported on this browser. Try Google Chrome, Edge, or Safari.',
        )
        return
      }

      // If already listening, stop first
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch {
          // ignore
        }
      }

      const recognition = new SpeechClass()
      recognitionRef.current = recognition

      recognition.continuous = false
      recognition.interimResults = true

      // Map display language to SpeechRecognition BCP-47 language tag
      if (sourceLanguage.toLowerCase() === 'hindi') {
        recognition.lang = 'hi-IN'
      } else {
        recognition.lang = 'en-IN'
      }

      let accumulated = ''

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        let interim = ''
        let final = ''
        /** Engine-reported confidences for final results only (0–1). */
        const finalConfidences: Array<{ confidence: number; length: number }> = []
        /** All alternatives the engine genuinely reported for final results. */
        const finalAlternatives: SpeechAlternative[] = []

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i]
          if (item.isFinal) {
            const primary = item[0]
            if (!primary?.transcript) continue
            final += primary.transcript
            const confidence = primary.confidence
            // Only collect values the engine actually reported.
            if (
              typeof confidence === 'number' &&
              Number.isFinite(confidence) &&
              confidence > 0
            ) {
              finalConfidences.push({
                confidence,
                length: primary.transcript.length || 1,
              })
            }

            // Collect every alternative the engine considered (the primary
            // at index 0 plus, when the engine reports them, the others).
            const alternativeCount = item.length ?? 1
            for (let j = 0; j < alternativeCount; j++) {
              const alternative = item[j]
              if (!alternative?.transcript) continue
              const altConfidence = alternative.confidence
              finalAlternatives.push({
                transcript: alternative.transcript,
                confidence:
                  typeof altConfidence === 'number' &&
                  Number.isFinite(altConfidence) &&
                  altConfidence > 0
                    ? altConfidence
                    : undefined,
              })
            }
          } else {
            interim += item[0]?.transcript ?? ''
          }
        }

        if (final) {
          accumulated += (accumulated ? ' ' : '') + final
          hasFinalResultRef.current = true
          setHasFinalResult(true)
          setTranscript(accumulated)
          onTranscriptChange?.(accumulated)

          // Length-weighted average of the confidences the engine actually
          // reported. If none were reported, pass undefined — never invent one.
          let confidence: number | undefined
          if (finalConfidences.length > 0) {
            const totalLength = finalConfidences.reduce((sum, c) => sum + c.length, 0)
            confidence =
              finalConfidences.reduce(
                (sum, c) => sum + c.confidence * c.length,
                0,
              ) / totalLength
          }
          onFinalTranscript?.(
            accumulated,
            confidence,
            finalAlternatives.length > 1 ? finalAlternatives : undefined,
          )
        } else if (interim) {
          const current = accumulated ? `${accumulated} ${interim}` : interim
          setTranscript(current)
          onTranscriptChange?.(current)
        }
      }

      recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
        setIsListening(false)
        if (event.error === 'no-speech') {
          onError?.('No voice was detected. Please try speaking again.')
        } else if (event.error === 'not-allowed') {
          onError?.('Microphone access denied. Please allow microphone permissions in your browser.')
        } else if (event.error === 'audio-capture') {
          onError?.('No microphone detected. Please check your audio input settings.')
        } else {
          onError?.(`Voice recognition issue: ${event.error}`)
        }
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      try {
        recognition.start()
        setIsListening(true)
      } catch {
        setIsListening(false)
        onError?.('Could not start microphone. Please try again.')
      }
    },
    [onError, onFinalTranscript, onTranscriptChange],
  )

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch {
          // ignore
        }
      }
    }
  }, [])

  return {
    isListening,
    transcript,
    setTranscript,
    /** Whether the engine delivered at least one final result this session. */
    hasFinalResult,
    hasFinalResultRef,
    isSupported,
    startListening,
    stopListening,
  }
}
