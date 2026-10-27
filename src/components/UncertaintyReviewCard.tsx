import type { ReactNode } from 'react'
import { AlertTriangle, Mic, Pencil, Loader2, Repeat2 } from 'lucide-react'
import type { UncertainSpan, UncertaintyFinding } from '../lib/uncertaintyDetection'
import { cn } from '../lib/cn'
import { Button } from './ui/Button'

interface UncertaintyReviewCardProps {
  /**
   * The detection result. May be null when the review was triggered
   * directly (e.g. a recording stopped before finalization) — the card
   * then shows only the reason and the actions.
   */
  finding: UncertaintyFinding | null
  reason: string
  isTranslating: boolean
  onChooseAlternative: (transcript: string) => void
  onEdit: () => void
  onConfirm: () => void
  onRecordAgain: () => void
}

/**
 * Renders text with its uncertain words visually highlighted. Spans are
 * character positions inside the exact `text` string, emitted by the
 * detection module — nothing is guessed at render time.
 */
function HighlightedText({ text, spans }: { text: string; spans: readonly UncertainSpan[] }) {
  const sorted = [...spans].sort((a, b) => a.start - b.start)
  const parts: ReactNode[] = []

  let cursor = 0
  sorted.forEach((span, index) => {
    if (span.start < cursor || span.end > text.length) return
    if (span.start > cursor) {
      parts.push(<span key={`text-${index}`}>{text.slice(cursor, span.start)}</span>)
    }
    parts.push(
      <mark
        key={`mark-${index}`}
        className="rounded-sm bg-amber-200/80 px-0.5 font-semibold text-amber-950"
        title={`Uncertain (${span.kind})`}
      >
        {text.slice(span.start, span.end)}
      </mark>,
    )
    cursor = span.end
  })
  if (cursor < text.length) {
    parts.push(<span key="text-tail">{text.slice(cursor)}</span>)
  }

  return <>{parts}</>
}

export function UncertaintyReviewCard({
  finding,
  reason,
  isTranslating,
  onChooseAlternative,
  onEdit,
  onConfirm,
  onRecordAgain,
}: UncertaintyReviewCardProps) {
  const alternatives = finding?.alternatives ?? []

  return (
    <div
      role="alert"
      aria-live="polite"
      className="rounded-2xl bg-amber-50/90 p-4 ring-1 ring-amber-500/30 sm:p-5"
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle
          className="mt-0.5 h-5 w-5 shrink-0 text-amber-600"
          strokeWidth={2}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-900">
            Check this before translating
          </p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-amber-800">{reason}</p>
        </div>
      </div>

      {finding && (
        <>
          {/* Recognized transcript with uncertain words highlighted */}
          <div className="mt-3.5 rounded-xl bg-white/85 px-3.5 py-3 ring-1 ring-amber-900/10">
            <p className="sr-only">Recognized text with uncertain words highlighted</p>
            <p className="text-[15px] leading-relaxed text-ink-900">
              <HighlightedText text={finding.transcript} spans={finding.uncertainSpans} />
            </p>
          </div>

          {/* Alternative transcripts the engine considered */}
          {alternatives.length > 0 && (
            <div className="mt-3.5">
              <p className="text-[11px] font-semibold tracking-[0.12em] text-amber-900 uppercase">
                We also heard
              </p>
              <ul className="mt-2 space-y-1.5">
                {alternatives.map((alternative, index) => (
                  <li key={`${alternative.transcript}-${index}`}>
                    <button
                      type="button"
                      onClick={() => onChooseAlternative(alternative.transcript)}
                      className={cn(
                        'w-full cursor-pointer rounded-xl bg-white/70 px-3.5 py-2.5 text-left ring-1 ring-amber-900/10',
                        'transition-colors duration-200 hover:bg-white hover:ring-amber-500/40',
                        'outline-offset-2 focus-visible:outline-2 focus-visible:outline-forest-600',
                      )}
                    >
                      <span className="block text-[14.5px] leading-relaxed text-ink-900">
                        <HighlightedText
                          text={alternative.transcript}
                          spans={alternative.spans}
                        />
                      </span>
                      <span className="mt-1 flex items-center gap-2 text-[12px] text-ink-500">
                        <Repeat2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                        Use this version
                        {typeof alternative.confidence === 'number' && (
                          <span aria-hidden="true">· ≈ {Math.round(alternative.confidence * 100)}% confident</span>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {/* Actions */}
      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <Button
          variant="primary"
          size="md"
          disabled={isTranslating}
          onClick={onConfirm}
          className={cn(isTranslating && 'cursor-wait opacity-80')}
        >
          {isTranslating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Translating...
            </>
          ) : (
            'Confirm & Translate'
          )}
        </Button>
        <Button variant="secondary" size="md" onClick={onEdit}>
          <Pencil className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          Edit Text
        </Button>
        <button
          type="button"
          onClick={onRecordAgain}
          className={cn(
            'inline-flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold text-forest-800',
            'transition-colors duration-200 hover:bg-forest-50 hover:text-forest-900',
            'outline-offset-2 focus-visible:outline-2 focus-visible:outline-forest-600',
          )}
        >
          <Mic className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          Record Again
        </button>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-ink-500">
        The highlighted words looked uncertain to the speech engine. Tap an
        alternative to use it, or edit the text field above before confirming.
      </p>
    </div>
  )
}
