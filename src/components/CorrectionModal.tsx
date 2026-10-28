import { useState, useEffect } from 'react'
import { Check, Edit3, Volume2, VolumeX, X } from 'lucide-react'
import {
  type ConversationEntry,
  type CorrectionPayload,
  type ErrorCategory,
} from '../services/conversationStorage'
import { speakKannada, stopSpeaking } from '../services/speechSynthesis'
import { Button } from './ui/Button'
import { cn } from '../lib/cn'

interface CorrectionModalProps {
  entry: ConversationEntry | null
  isOpen: boolean
  onClose: () => void
  onSave: (id: string, payload: CorrectionPayload) => Promise<void> | void
}

const ERROR_CATEGORIES: { value: ErrorCategory; label: string; description: string }[] = [
  { value: 'mistranslation', label: 'Mistranslation', description: 'Incorrect word or meaning' },
  { value: 'grammar', label: 'Grammar & Phrasing', description: 'Unnatural word order or grammar' },
  { value: 'spelling', label: 'Spelling / Script', description: 'Typo or incorrect Kannada glyph' },
  { value: 'tone', label: 'Tone / Formality', description: 'Too formal, informal, or inappropriate tone' },
  { value: 'incomplete', label: 'Incomplete', description: 'Words cut off or missing from output' },
  { value: 'other', label: 'Other', description: 'General refinement' },
]

export function CorrectionModal({
  entry,
  isOpen,
  onClose,
  onSave,
}: CorrectionModalProps) {
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        stopSpeaking()
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !entry) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="correction-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-forest-900/40 backdrop-blur-xs transition-opacity"
        onClick={() => {
          stopSpeaking()
          onClose()
        }}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-canvas-50 p-6 sm:p-8 shadow-lifted ring-1 ring-forest-900/10 my-8">
        <button
          type="button"
          onClick={() => {
            stopSpeaking()
            onClose()
          }}
          aria-label="Close correction modal"
          className="absolute top-5 right-5 rounded-full p-2 text-ink-400 hover:bg-forest-900/5 hover:text-ink-700 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-forest-100 text-forest-800">
            <Edit3 className="h-5 w-5" />
          </div>
          <div>
            <h2 id="correction-modal-title" className="font-display text-xl font-semibold text-forest-900">
              Correct Translation
            </h2>
            <p className="text-xs text-ink-500">
              Your edits create a correction trail while preserving the original translation.
            </p>
          </div>
        </div>

        <CorrectionForm
          key={`${entry.id}-${entry.updatedAt || 0}`}
          entry={entry}
          onClose={onClose}
          onSave={onSave}
        />
      </div>
    </div>
  )
}

interface CorrectionFormProps {
  entry: ConversationEntry
  onClose: () => void
  onSave: (id: string, payload: CorrectionPayload) => Promise<void> | void
}

function CorrectionForm({ entry, onClose, onSave }: CorrectionFormProps) {
  const initialKannada = entry.correctedTranslation?.kannada || entry.initialTranslation.kannada
  const initialTranslit =
    entry.correctedTranslation?.transliteration || entry.initialTranslation.transliteration || ''
  const initialNote = entry.correctedTranslation?.note || ''
  const initialCategory = entry.errorCategory || 'mistranslation'

  const [correctedKannada, setCorrectedKannada] = useState(initialKannada)
  const [correctedTransliteration, setCorrectedTransliteration] = useState(initialTranslit)
  const [errorCategory, setErrorCategory] = useState<ErrorCategory>(initialCategory)
  const [note, setNote] = useState(initialNote)
  const [isPlaying, setIsPlaying] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      stopSpeaking()
    }
  }, [])

  const handleAudioPreview = () => {
    if (!correctedKannada.trim()) return

    if (isPlaying) {
      stopSpeaking()
      setIsPlaying(false)
      return
    }

    speakKannada(
      correctedKannada,
      correctedTransliteration,
      () => setIsPlaying(true),
      () => setIsPlaying(false),
      () => setIsPlaying(false),
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedKannada = correctedKannada.trim()
    if (!trimmedKannada) {
      setValidationError('Please provide a corrected Kannada translation.')
      return
    }

    try {
      setIsSubmitting(true)
      setValidationError(null)
      stopSpeaking()
      await onSave(entry.id, {
        kannada: trimmedKannada,
        transliteration: correctedTransliteration.trim() || undefined,
        note: note.trim() || undefined,
        errorCategory,
      })
      onClose()
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Failed to save correction.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-5">
      {/* Read-only reference: Original transcript & Initial translation */}
      <div className="rounded-2xl bg-canvas-100/80 p-4 ring-1 ring-forest-900/8 space-y-3">
        <div>
          <span className="text-[11px] font-semibold tracking-wider text-ink-400 uppercase">
            Original Text ({entry.sourceLanguage})
          </span>
          <p className="mt-0.5 text-sm font-medium text-forest-900">
            "{entry.sourceText}"
          </p>
        </div>

        <div className="border-t border-forest-900/6 pt-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider text-ink-400 uppercase">
              Initial AI Translation (Preserved)
            </span>
            <span className="rounded-full bg-forest-900/5 px-2 py-0.5 text-[10px] font-medium text-forest-700">
              Read-Only
            </span>
          </div>
          <p className="mt-1 font-kannada text-base font-medium text-ink-700">
            {entry.initialTranslation.kannada}
          </p>
          {entry.initialTranslation.transliteration && (
            <p className="mt-0.5 text-xs italic text-ink-500">
              "{entry.initialTranslation.transliteration}"
            </p>
          )}
        </div>
      </div>

      {/* Editable: Corrected Kannada translation */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label
            htmlFor="corrected-kannada"
            className="text-xs font-semibold tracking-wider text-forest-800 uppercase"
          >
            Corrected Kannada Translation <span className="text-rose-500">*</span>
          </label>
          <button
            type="button"
            onClick={handleAudioPreview}
            disabled={!correctedKannada.trim()}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-forest-600 hover:text-forest-800 disabled:opacity-40 transition-colors cursor-pointer"
          >
            {isPlaying ? (
              <>
                <VolumeX className="h-3.5 w-3.5 text-emerald-600" />
                <span>Stop Preview</span>
              </>
            ) : (
              <>
                <Volume2 className="h-3.5 w-3.5" />
                <span>Preview Audio</span>
              </>
            )}
          </button>
        </div>
        <textarea
          id="corrected-kannada"
          rows={3}
          value={correctedKannada}
          onChange={(e) => {
            setCorrectedKannada(e.target.value)
            if (validationError) setValidationError(null)
          }}
          placeholder="Enter corrected Kannada translation..."
          className={cn(
            'w-full resize-none rounded-2xl border-0 bg-white px-4 py-3',
            'font-kannada text-lg leading-relaxed text-forest-900 font-medium',
            'ring-1 ring-forest-900/12 placeholder:font-sans placeholder:text-sm placeholder:text-ink-400',
            'focus:ring-2 focus:ring-forest-600 outline-none transition-shadow',
          )}
        />
      </div>

      {/* Optional: Corrected Transliteration */}
      <div>
        <label
          htmlFor="corrected-transliteration"
          className="block text-xs font-semibold tracking-wider text-forest-800 uppercase mb-1.5"
        >
          Phonetic Pronunciation Guide (Transliteration, Optional)
        </label>
        <input
          id="corrected-transliteration"
          type="text"
          value={correctedTransliteration}
          onChange={(e) => setCorrectedTransliteration(e.target.value)}
          placeholder="e.g. Hege iddira? (How to pronounce in English alphabet)"
          className="w-full rounded-xl border-0 bg-white px-4 py-2.5 text-sm text-ink-900 ring-1 ring-forest-900/12 placeholder:text-ink-400 focus:ring-2 focus:ring-forest-600 outline-none transition-shadow"
        />
      </div>

      {/* Error Category Selection */}
      <div>
        <label
          htmlFor="error-category"
          className="block text-xs font-semibold tracking-wider text-forest-800 uppercase mb-1.5"
        >
          Why was the original translation incorrect?
        </label>
        <select
          id="error-category"
          value={errorCategory}
          onChange={(e) => setErrorCategory(e.target.value as ErrorCategory)}
          className="w-full cursor-pointer rounded-xl border-0 bg-white px-4 py-2.5 text-sm font-medium text-forest-900 ring-1 ring-forest-900/12 focus:ring-2 focus:ring-forest-600 outline-none transition-colors"
        >
          {ERROR_CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label} — {cat.description}
            </option>
          ))}
        </select>
      </div>

      {/* Optional note */}
      <div>
        <label
          htmlFor="correction-note"
          className="block text-xs font-semibold tracking-wider text-forest-800 uppercase mb-1.5"
        >
          Correction Notes (Optional)
        </label>
        <input
          id="correction-note"
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. In everyday Bengaluru Kannada, this phrase is more common"
          className="w-full rounded-xl border-0 bg-white px-4 py-2.5 text-sm text-ink-900 ring-1 ring-forest-900/12 placeholder:text-ink-400 focus:ring-2 focus:ring-forest-600 outline-none transition-shadow"
        />
      </div>

      {validationError && (
        <p className="text-xs font-medium text-rose-600">{validationError}</p>
      )}

      <div className="flex items-center justify-between border-t border-forest-900/8 pt-5">
        <span className="text-[11px] text-ink-400">
          Note: This correction is stored locally and will not modify future AI prompts.
        </span>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={() => {
              stopSpeaking()
              onClose()
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isSubmitting || !correctedKannada.trim()}
          >
            <Check className="h-4 w-4" />
            {isSubmitting ? 'Saving...' : 'Save Correction'}
          </Button>
        </div>
      </div>
    </form>
  )
}
