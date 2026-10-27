/**
 * Smart Conversation Rescue — transcript validation.
 *
 * IMPORTANT: These checks are deliberately limited to what the speech
 * engine genuinely reports. We never invent confidence scores or
 * randomly flag words as uncertain.
 *
 * Limitations explained:
 * - Confidence: the Web Speech API (Chrome/Edge) reports a real
 *   `confidence` value (0–1) per recognized alternative. Safari and
 *   Firefox either omit it or lack the API entirely. When the engine
 *   does not report a confidence, we treat it as unavailable — we do
 *   not fabricate one, and the result is accepted based only on the
 *   structural checks below.
 * - "Incomplete" utterances are only detectable when the user stops
 *   the recording before the engine delivered any final result
 *   (interim text only). Inside a delivered final result the engine
 *   has no "incompleteness" signal, so no heuristic is invented.
 */

export type TranscriptStatus = 'ok' | 'needs-review' | 'empty'

export interface TranscriptCheckOk {
  status: 'ok'
  reason: null
}

export interface TranscriptReviewCheck {
  status: 'needs-review'
  /** Human-readable explanation for the user. */
  reason: string
}

export interface TranscriptEmptyCheck {
  status: 'empty'
  /** Human-readable explanation for the user. */
  reason: string
}

export type TranscriptCheck = TranscriptCheckOk | TranscriptReviewCheck | TranscriptEmptyCheck

/**
 * Below this (real, engine-reported) confidence we pause automatic
 * translation and ask the user to confirm or correct the text.
 */
export const LOW_CONFIDENCE_THRESHOLD = 0.6

/**
 * Evaluate a final speech-recognition result.
 *
 * @param transcript The final transcript text (may be empty).
 * @param confidence The engine-reported confidence for the final
 *   result (0–1), or undefined when the engine does not provide one.
 */
export function evaluateTranscript(
  transcript: string,
  confidence?: number,
): TranscriptCheck {
  const trimmed = transcript.trim()

  // Empty result: nothing was recognized.
  if (!trimmed) {
    return {
      status: 'empty',
      reason: 'No speech was recognized. Please try speaking again.',
    }
  }

  // Punctuation-only / whitespace-only result: nothing meaningful was recognized.
  const meaningful = trimmed.replace(/[\p{P}\p{Zs}\s]/gu, '')
  if (!meaningful) {
    return {
      status: 'needs-review',
      reason:
        'What we heard was not usable speech. Please repeat your sentence.',
    }
  }

  // Real confidence check — only when the engine actually reported a value.
  if (typeof confidence === 'number' && Number.isFinite(confidence)) {
    if (confidence < LOW_CONFIDENCE_THRESHOLD) {
      return {
        status: 'needs-review',
        reason:
          'We may not have heard you clearly (reported confidence was low). Please correct the text below or repeat your sentence.',
      }
    }
    return { status: 'ok', reason: null }
  }

  // Confidence was not provided by this browser engine — accept the
  // non-empty text based on structural checks only (see limitations above).
  return { status: 'ok', reason: null }
}

/**
 * Evaluate text that was never finalized by the engine (user stopped
 * the recording while only interim results existed) — a genuinely
 * detectable "incomplete" case.
 */
export function evaluateUnfinalizedText(text: string): TranscriptCheck {
  if (!text.trim()) {
    return {
      status: 'empty',
      reason: 'Recording stopped with nothing recognized. Please speak again.',
    }
  }
  return {
    status: 'needs-review',
    reason:
      'Recording stopped before your sentence was fully recognized. Please review and correct the text below, or repeat it.',
  }
}
