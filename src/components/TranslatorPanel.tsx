import { useState, useCallback, useRef } from 'react'
import {
  ArrowLeftRight,
  ChevronDown,
  Copy,
  Check,
  Globe,
  Languages,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Loader2,
  Sparkles,
  RotateCcw,
} from 'lucide-react'
import { IconButton } from './ui/IconButton'
import { Notice } from './ui/Notice'
import { Button } from './ui/Button'
import { cn } from '../lib/cn'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { translateToKannada } from '../services/geminiTranslator'
import { speakKannada, stopSpeaking } from '../services/speechSynthesis'
import {
  detectUncertainty,
  evaluateUnfinalizedText,
  type UncertaintyFinding,
} from '../lib/uncertaintyDetection'
import { UncertaintyReviewCard } from './UncertaintyReviewCard'

const SOURCE_LANGUAGES = ['English', 'Hindi'] as const
const TARGET_LANGUAGE = 'Kannada' as const

export function TranslatorPanel() {
  type MessageTone = 'default' | 'attention' | 'error'

  const [sourceLanguage, setSourceLanguage] = useState<string>('English')
  const [message, setMessage] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [outputValue, setOutputValue] = useState('')
  const [transliteration, setTransliteration] = useState('')
  const [isTranslating, setIsTranslating] = useState(false)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [copied, setCopied] = useState(false)
  const [messageTone, setMessageTone] = useState<MessageTone>('default')
  /**
   * Active Smart Uncertainty Detection review: the user must confirm or
   * correct the recognized text before anything is translated or spoken.
   */
  const [review, setReview] = useState<{
    reason: string
    finding: UncertaintyFinding | null
  } | null>(null)
  const sourceTextRef = useRef<HTMLTextAreaElement>(null)
  const needsReview = review !== null

  const showMessage = (text: string, tone: MessageTone = 'default') => {
    setMessage(text)
    setMessageTone(tone)
  }

  const clearMessage = () => {
    setMessage(null)
    setMessageTone('default')
  }

  // Translation function
  const handleTranslate = useCallback(
    async (textToTranslate?: string) => {
      const text = (textToTranslate ?? inputValue).trim()
      if (!text) {
        showMessage('Please speak or type a sentence to translate.', 'attention')
        return
      }

      setIsTranslating(true)
      clearMessage()

      try {
        const result = await translateToKannada(text, sourceLanguage)
        setOutputValue(result.kannada)
        setTransliteration(result.transliteration || '')
        showMessage('Translation complete! You can listen or copy below.')
      } catch (err: unknown) {
        const errMessage =
          err instanceof Error ? err.message : 'Translation error. Please check your network.'
        showMessage(errMessage, 'error')
      } finally {
        setIsTranslating(false)
      }
    },
    [inputValue, sourceLanguage],
  )

  // Speech recognition hook
  const {
    isListening,
    startListening,
    stopListening,
    hasFinalResultRef,
    isSupported: speechSupported,
  } = useSpeechRecognition({
    onTranscriptChange: (current) => {
      setInputValue(current)
    },
    onFinalTranscript: (final, confidence, alternatives) => {
      setInputValue(final)

      // Smart Uncertainty Detection: validate the final transcript using
      // only genuinely available signals (real engine confidence, empty
      // results, punctuation-only results, and real disagreement between
      // the engine's alternative transcripts).
      const finding = detectUncertainty(final, confidence, alternatives)
      if (finding.level === 'review') {
        // Pause automatic translation (and therefore speech playback) and
        // ask the user to resolve the uncertainty first; the source
        // textarea stays editable.
        setReview({ reason: finding.reason ?? '', finding })
      } else if (finding.level === 'empty') {
        showMessage(finding.reason ?? '', 'attention')
      } else {
        void handleTranslate(final)
      }
    },
    onError: (err) => {
      showMessage(err, 'error')
    },
  })

  const confirmAndTranslate = async () => {
    // The user confirmed the (possibly corrected) text — clear the
    // review state and translate what is currently in the field.
    setReview(null)
    await handleTranslate()
  }

  /** Fill the field with a chosen alternative; confirmation is still required. */
  const chooseAlternative = (transcript: string) => {
    setInputValue(transcript)
    clearMessage()
  }

  const focusSourceText = () => {
    sourceTextRef.current?.focus()
  }

  const handleRecordAgain = () => {
    if (isListening) stopListening()
    setReview(null)
    showMessage(`Listening in ${sourceLanguage}... Speak clearly into your mic.`)
    startListening(sourceLanguage)
  }

  const toggleListening = () => {
    if (!speechSupported) {
      showMessage(
        'Voice input is not supported in this browser. Please try Chrome, Edge, or Safari.',
        'error',
      )
      return
    }

    if (isListening) {
      stopListening()
      if (inputValue.trim()) {
        if (!hasFinalResultRef.current) {
          // Recording stopped before the engine finalized the sentence:
          // the text is likely incomplete, so pause and ask for review.
          const check = evaluateUnfinalizedText(inputValue)
          if (check.level === 'review') {
            setReview({ reason: check.reason, finding: null })
          }
        }
        // If a final result was already delivered, onFinalTranscript
        // above has already validated and translated it.
      }
    } else {
      setReview(null)
      showMessage(`Listening in ${sourceLanguage}... Speak clearly into your mic.`)
      startListening(sourceLanguage)
    }
  }

  const handleAudioPlayback = () => {
    if (!outputValue.trim()) {
      showMessage('Nothing to play yet. Translate a sentence first.')
      return
    }

    if (isPlayingAudio) {
      stopSpeaking()
      setIsPlayingAudio(false)
      return
    }

    const started = speakKannada(
      outputValue,
      transliteration,
      () => setIsPlayingAudio(true),
      () => setIsPlayingAudio(false),
      (err) => {
        setIsPlayingAudio(false)
        showMessage(err, 'error')
      },
    )

    if (!started) {
      setIsPlayingAudio(false)
    }
  }

  const handleCopy = async () => {
    if (!outputValue.trim()) {
      showMessage('Nothing to copy yet.')
      return
    }

    const textToCopy = transliteration
      ? `${outputValue}\n(${transliteration})`
      : outputValue

    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      showMessage('Copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      showMessage('Failed to copy to clipboard.', 'error')
    }
  }

  const handleReset = () => {
    if (isListening) stopListening()
    if (isPlayingAudio) stopSpeaking()
    setInputValue('')
    setOutputValue('')
    setTransliteration('')
    setReview(null)
    clearMessage()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (needsReview) {
        void confirmAndTranslate()
      } else {
        void handleTranslate()
      }
    }
  }

  return (
    <section id="translator" className="scroll-mt-24 py-8 sm:py-12">
      <div className="mx-auto max-w-4xl px-5 sm:px-8">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 text-[13px] font-semibold tracking-[0.14em] text-forest-500 uppercase">
            <Languages className="h-4 w-4" aria-hidden="true" />
            AI Voice & Text Translator
          </span>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-forest-900 sm:text-4xl">
            Your words, into Kannada
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-ink-500">
            Choose your language, tap the microphone to speak, or type your message.
            We will translate and teach you how to pronounce it!
          </p>
        </div>

        {/* Panel */}
        <div className="mt-10 overflow-hidden rounded-3xl bg-white/85 shadow-lifted ring-1 ring-forest-900/10 backdrop-blur-sm">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] md:items-start">
            {/* Source side */}
            <div className="p-5 sm:p-7">
              <PanelLabel icon={Globe} text="You speak / type" />
              <LanguageSelector
                id="source-language"
                label="Source language"
                value={sourceLanguage}
                options={SOURCE_LANGUAGES}
                onChange={(val) => {
                  setSourceLanguage(val)
                  if (isListening) stopListening()
                }}
              />

              <label htmlFor="source-text" className="sr-only">
                Message to translate
              </label>
              <div className="relative mt-4">
                <textarea
                  id="source-text"
                  ref={sourceTextRef}
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isListening
                      ? 'Listening to your voice...'
                      : `Type or click "Speak" to say something in ${sourceLanguage}...`
                  }
                  rows={5}
                  className={cn(
                    'w-full resize-none rounded-2xl border-0 bg-canvas-100 px-4 py-3.5',
                    'text-[15px] leading-relaxed text-ink-900 ring-1 ring-forest-900/10',
                    'placeholder:text-ink-400',
                    'transition-shadow duration-200 outline-none',
                    isListening
                      ? 'ring-2 ring-emerald-500 bg-emerald-50/30'
                      : needsReview
                        ? 'ring-2 ring-amber-400 bg-amber-50/40'
                        : 'focus:ring-2 focus:ring-forest-400',
                  )}
                />

                {inputValue && (
                  <button
                    type="button"
                    onClick={handleReset}
                    aria-label="Clear input"
                    title="Clear"
                    className="absolute top-3 right-3 text-ink-400 hover:text-ink-700 transition-colors p-1"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Action controls: Speak & Translate */}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  aria-label={isListening ? 'Stop listening' : 'Start voice translation'}
                  title={isListening ? 'Stop listening' : 'Start voice translation'}
                  onClick={toggleListening}
                  className={cn(
                    'group relative inline-flex h-12 items-center gap-2.5 rounded-full px-5 text-sm font-semibold text-white shadow-soft',
                    'cursor-pointer transition-all duration-200 ease-out',
                    'outline-offset-2 focus-visible:outline-2 focus-visible:outline-forest-600',
                    isListening
                      ? 'bg-rose-600 hover:bg-rose-700 ring-2 ring-rose-400 ring-offset-2'
                      : 'bg-forest-800 hover:bg-forest-700 hover:shadow-lifted hover:-translate-y-px',
                  )}
                >
                  {isListening ? (
                    <>
                      <span
                        className="absolute inset-0 rounded-full bg-rose-400/40 animate-ping"
                        aria-hidden="true"
                      />
                      <MicOff className="h-4 w-4 relative z-10" />
                      <span className="relative z-10">Stop (Listening...)</span>
                    </>
                  ) : (
                    <>
                      <span
                        className="absolute inset-0 rounded-full bg-forest-500/40 animate-pulse-ring"
                        aria-hidden="true"
                      />
                      <Mic className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                      <span>Speak</span>
                    </>
                  )}
                </button>

                <Button
                  variant="secondary"
                  size="md"
                  disabled={isTranslating || !inputValue.trim()}
                  onClick={
                    needsReview
                      ? () => void confirmAndTranslate()
                      : () => void handleTranslate()
                  }
                  className="h-12 text-sm"
                >
                  {isTranslating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-forest-700" />
                      Translating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-forest-600" />
                      {needsReview ? 'Confirm & Translate' : 'Translate'}
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Direction divider with a flowing badge on desktop */}
            <div
              className="relative mx-7 self-center max-md:hidden"
              aria-hidden="true"
            >
              <div className="h-[280px] w-px bg-gradient-to-b from-transparent via-forest-900/12 to-transparent" />
              <div className="absolute top-1/2 left-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-forest-800 text-canvas-50 shadow-soft">
                <ArrowLeftRight className="h-4 w-4" strokeWidth={2} />
              </div>
            </div>

            {/* Horizontal divider on mobile */}
            <div className="mx-5 h-px bg-gradient-to-r from-transparent via-forest-900/12 to-transparent md:hidden" />

            {/* Target side */}
            <div className="p-5 sm:p-7">
              <PanelLabel icon={Languages} text="In Kannada" />
              <LanguageSelector
                id="target-language"
                label="Target language"
                value={TARGET_LANGUAGE}
                options={[TARGET_LANGUAGE] as const}
                readOnly
              />

              <label htmlFor="target-text" className="sr-only">
                Kannada translation
              </label>
              <div className="mt-4 relative">
                <textarea
                  id="target-text"
                  value={outputValue}
                  readOnly
                  placeholder={
                    isTranslating
                      ? 'Translating into Kannada...'
                      : 'Your Kannada translation will appear here...'
                  }
                  rows={5}
                  aria-readonly="true"
                  className={cn(
                    'w-full resize-none rounded-2xl border-0 bg-forest-900/[0.035] px-4 py-3.5',
                    'font-kannada text-lg leading-relaxed text-forest-900 font-medium',
                    'ring-1 ring-forest-900/10 placeholder:text-ink-400',
                    'cursor-default outline-none',
                  )}
                />
              </div>

              {/* Transliteration Guide (Pronunciation) */}
              {transliteration && (
                <div className="mt-3 rounded-xl bg-forest-50/80 px-3.5 py-2 ring-1 ring-forest-900/8 text-xs">
                  <span className="font-semibold text-forest-700">Pronunciation: </span>
                  <span className="font-medium text-ink-700 italic">
                    "{transliteration}"
                  </span>
                </div>
              )}

              {/* Playback and copy */}
              <div className="mt-4 flex items-center gap-2.5">
                <IconButton
                  label={isPlayingAudio ? 'Stop audio' : 'Play Kannada audio'}
                  icon={isPlayingAudio ? VolumeX : Volume2}
                  disabled={!outputValue.trim()}
                  onClick={handleAudioPlayback}
                  className={cn(
                    isPlayingAudio &&
                      'bg-emerald-100 text-emerald-800 ring-2 ring-emerald-500 animate-pulse',
                  )}
                />
                <IconButton
                  label={copied ? 'Copied' : 'Copy Kannada translation'}
                  icon={copied ? Check : Copy}
                  disabled={!outputValue.trim()}
                  onClick={() => void handleCopy()}
                  className={cn(copied && 'bg-emerald-100 text-emerald-800')}
                />
                <span className="ml-1 text-xs font-medium text-ink-400">
                  {outputValue
                    ? 'Listen to pronunciation or copy'
                    : 'Actions activate when translated'}
                </span>
              </div>
            </div>
          </div>

          {/* Smart Uncertainty Detection review */}
          {review && (
            <div className="border-t border-forest-900/6 bg-canvas-50/40 px-5 py-4 sm:px-7">
              <UncertaintyReviewCard
                finding={review.finding}
                reason={review.reason}
                isTranslating={isTranslating}
                onChooseAlternative={chooseAlternative}
                onEdit={focusSourceText}
                onConfirm={() => void confirmAndTranslate()}
                onRecordAgain={handleRecordAgain}
              />
            </div>
          )}

          {/* Shared status strip */}
          <div className="border-t border-forest-900/6 bg-canvas-100/60 px-5 py-3.5 text-center sm:px-7">
            {message ? (
              <Notice tone={messageTone}>{message}</Notice>
            ) : (
              <p className="text-[13px] leading-relaxed text-ink-400">
                Powered by voice recognition and Gemini AI. Click <strong>Speak</strong> or type your message.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- internal pieces ---------- */

type PanelLabelProps = {
  icon: typeof Globe
  text: string
}

function PanelLabel({ icon: Icon, text }: PanelLabelProps) {
  return (
    <span className="mb-3 inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.12em] text-ink-500 uppercase">
      <Icon className="h-3.5 w-3.5 text-forest-500" strokeWidth={2} aria-hidden="true" />
      {text}
    </span>
  )
}

type LanguageSelectorProps = {
  id: string
  label: string
  value: string
  options: readonly string[]
  onChange?: (value: string) => void
  readOnly?: boolean
}

function LanguageSelector({
  id,
  label,
  value,
  options,
  onChange,
  readOnly = false,
}: LanguageSelectorProps) {
  const disabled = readOnly || options.length < 2

  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        aria-label={label}
        onChange={(event) => onChange?.(event.target.value)}
        className={cn(
          'w-full cursor-pointer appearance-none rounded-xl bg-canvas-50 pl-4 pr-10 py-2.5',
          'text-sm font-medium text-forest-900 ring-1 ring-forest-900/12',
          'transition-colors hover:ring-forest-800/25',
          'outline-offset-2 focus-visible:outline-2 focus-visible:outline-forest-600',
          'disabled:cursor-default disabled:bg-forest-900/[0.04] disabled:text-forest-700 disabled:hover:ring-forest-900/12',
        )}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3.5 h-4 w-4 -translate-y-1/2 text-ink-400"
        strokeWidth={2}
        aria-hidden="true"
      />
    </div>
  )
}
