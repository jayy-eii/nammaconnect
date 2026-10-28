import { useState, useEffect } from 'react'
import { X, ZoomIn, ZoomOut, RotateCw } from 'lucide-react'
import { type OfflinePhrase } from '../data/offlinePhrases'
import { cn } from '../lib/cn'

interface ShowToSomeoneModalProps {
  phrase: OfflinePhrase | null
  meaningLanguage?: 'English' | 'Hindi'
  isOpen: boolean
  onClose: () => void
}

export function ShowToSomeoneModal({
  phrase,
  isOpen,
  onClose,
}: ShowToSomeoneModalProps) {
  const [isExtraLarge, setIsExtraLarge] = useState(false)
  const [isFlipped, setIsFlipped] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !phrase) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Show to Someone View"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-forest-950/80 backdrop-blur-md"
    >
      <div
        className={cn(
          'relative w-full max-w-3xl overflow-hidden rounded-3xl bg-white p-6 sm:p-10 shadow-2xl ring-2 ring-forest-900/15 transition-transform duration-300',
          isFlipped && 'rotate-180',
        )}
      >
        {/* Top Control Bar */}
        <div className="flex items-center justify-between border-b border-forest-900/10 pb-4">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold tracking-wider text-emerald-900 uppercase">
              Show to Someone
            </span>
            <span className="text-xs text-ink-500 max-sm:hidden">
              Hold your screen up for the other person to read
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Flip 180° for person facing you */}
            <button
              type="button"
              onClick={() => setIsFlipped((prev) => !prev)}
              title="Flip 180° for the person in front of you"
              className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-canvas-200/80 px-3 py-1.5 text-xs font-semibold text-forest-800 hover:bg-canvas-300 transition-colors"
            >
              <RotateCw className="h-3.5 w-3.5" />
              <span>{isFlipped ? 'Normal' : 'Flip for them'}</span>
            </button>

            {/* Toggle Font Size */}
            <button
              type="button"
              onClick={() => setIsExtraLarge((prev) => !prev)}
              title="Toggle font size"
              className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-canvas-200/80 px-3 py-1.5 text-xs font-semibold text-forest-800 hover:bg-canvas-300 transition-colors"
            >
              {isExtraLarge ? <ZoomOut className="h-3.5 w-3.5" /> : <ZoomIn className="h-3.5 w-3.5" />}
              <span>{isExtraLarge ? 'A-' : 'A+'}</span>
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-full p-2 text-ink-400 hover:bg-forest-900/5 hover:text-ink-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Big Kannada Display Area */}
        <div className="my-8 text-center sm:my-12">
          <p
            className={cn(
              'font-kannada font-bold text-forest-950 leading-relaxed tracking-wide',
              isExtraLarge
                ? 'text-4xl sm:text-6xl md:text-7xl'
                : 'text-3xl sm:text-5xl md:text-5xl',
            )}
          >
            {phrase.kannada}
          </p>

          {/* Pronunciation guide */}
          <p className="mt-4 text-sm sm:text-base font-semibold text-forest-700 italic">
            Pronounce: "{phrase.transliteration}"
          </p>
        </div>

        {/* Both Meanings Clearly Separated */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
          {/* English Meaning */}
          <div className="rounded-2xl bg-canvas-100/90 p-4 ring-1 ring-forest-900/8">
            <span className="text-[11px] font-bold tracking-wider text-forest-700 uppercase">
              English Meaning
            </span>
            <p className="mt-1 text-base sm:text-lg font-semibold text-ink-900">
              {phrase.english}
            </p>
          </div>

          {/* Hindi Meaning */}
          <div className="rounded-2xl bg-canvas-100/90 p-4 ring-1 ring-forest-900/8">
            <span className="text-[11px] font-bold tracking-wider text-forest-700 uppercase">
              हिंदी (Hindi) Meaning
            </span>
            <p className="mt-1 text-base sm:text-lg font-semibold text-ink-900">
              {phrase.hindi}
            </p>
          </div>
        </div>

        {/* Safety Note if present */}
        {phrase.safetyNote && (
          <p className="mt-4 text-center text-xs font-semibold text-amber-900 bg-amber-50 rounded-xl p-3 ring-1 ring-amber-300">
            ⚠️ {phrase.safetyNote}
          </p>
        )}
      </div>
    </div>
  )
}
