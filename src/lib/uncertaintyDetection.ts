/**
 * Smart Uncertainty Detection for NammaConnect.
 *
 * This module decides whether a speech-recognition result is trustworthy
 * enough to translate automatically, or whether the user should first
 * confirm / correct the recognized text.
 *
 * Design rules:
 * - Deterministic, evidence-based rules only. No random flagging, no
 *   invented confidence values.
 * - The browser Web Speech API (Chrome/Edge) reports:
 *     * one overall confidence (0–1) per final result — sometimes,
 *     * one or more alternative transcripts — sometimes.
 *   Word-level confidences and word timings are NOT provided by this API,
 *   so no word-level rule pretends to use them.
 * - Missing data is handled safely: when the engine reports no confidence
 *   or no alternatives, we fall back to structural checks only.
 * - We never claim a word was "omitted" — we only flag words when the
 *   alternatives actually disagree about them, which is real evidence.
 */

export interface SpeechAlternative {
  transcript: string
  /**
   * Engine-reported confidence (0–1) or undefined when the engine did
   * not report one for this alternative.
   */
  confidence?: number
}

export type UncertaintyKind = 'negation' | 'number' | 'datetime' | 'name' | 'other'

export type UncertaintyLevel = 'ok' | 'review' | 'empty'

export interface UncertainSpan {
  /** Character positions inside the transcript this span belongs to. */
  readonly start: number
  readonly end: number
  readonly token: string
  readonly kind: UncertaintyKind
}

export interface AlternativeView extends SpeechAlternative {
  /** Uncertain words inside this alternative's own transcript string. */
  readonly spans: readonly UncertainSpan[]
}

export interface UncertaintyFinding {
  readonly level: UncertaintyLevel
  /** Human-readable explanation, when the result needs user attention. */
  readonly reason: string | null
  readonly severity: 'low' | 'high'
  /** The final transcript the engine chose as its best result. */
  readonly transcript: string
  /** Highlighted (uncertain) words inside `transcript`. */
  readonly uncertainSpans: readonly UncertainSpan[]
  /** Other transcripts the engine considered, with uncertain words highlighted. */
  readonly alternatives: readonly AlternativeView[]
}

/**
 * Below this (real, engine-reported) confidence we pause automatic
 * translation and ask the user to confirm or correct the text.
 */
export const LOW_CONFIDENCE_THRESHOLD = 0.6

/** Negation words whose presence or absence can flip the meaning. */
const NEGATION_TOKENS = new Set([
  'not',
  'no',
  'never',
  'none',
  'nothing',
  'cannot',
  'cant',
  'dont',
  'wont',
  'isnt',
  'arent',
  'wasnt',
  'werent',
  'didnt',
  'doesnt',
  'shouldnt',
  'wouldnt',
  'nahi',
  'nahin',
  'mat',
])

/** Number words (English + common romanized Hindi) that may be ambiguous. */
const NUMBER_TOKENS = new Set([
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
  'nine', 'ten', 'eleven', 'twelve', 'twenty', 'fifty', 'hundred',
  'thousand', 'do', 'teen', 'char', 'chaar', 'panch', 'paanch', 'das',
  'sau', 'hazaar',
])

/** Day/date/part-of-day words whose misrecognition changes when something happens. */
const DATETIME_TOKENS = new Set([
  'today', 'tomorrow', 'yesterday', 'morning', 'noon', 'afternoon',
  'evening', 'night', 'monday', 'tuesday', 'wednesday', 'thursday',
  'friday', 'saturday', 'sunday', 'aaj', 'kal', 'parso', 'subah',
  'dopahar', 'shaam', 'raat', 'week', 'month', 'year', 'hour', 'minute',
])

/**
 * Interjections that carry no meaning — differences made up only of
 * these are deliberately treated as low-risk.
 */
const FILLER_TOKENS = new Set(['um', 'uh', 'umm', 'uhh', 'hmm', 'mm', 'er', 'ah', 'huh'])

const ONLY_PUNCTUATION_RE = /[\p{P}\p{Zs}\s]/gu
const QUOTE_RE = /['’`]/gu
const PUNCT_RE = /[.,!?¡¿;:"(){}[\]]/gu
const TIME_LIKE_RE = /^\d{1,2}:\d{2}(:\d{2})?(am|pm)?$/
const DIGITS_RE = /^\d+([.,]\d+)*$/
const UPPERCASE_START_RE = /\p{Lu}/u

interface TokenRange {
  readonly raw: string
  readonly norm: string
  readonly start: number
  readonly end: number
}

function tokenizeRanges(text: string): TokenRange[] {
  const ranges: TokenRange[] = []
  const re = /\S+/g
  for (const match of text.matchAll(re)) {
    const raw = match[0] ?? ''
    const start = match.index ?? 0
    const norm = raw
      .replace(QUOTE_RE, '')
      .replace(PUNCT_RE, '')
      .toLowerCase()
    ranges.push({ raw, norm, start, end: start + raw.length })
  }
  return ranges
}

function tokenCounts(ranges: readonly TokenRange[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const range of ranges) {
    if (!range.norm) continue
    counts.set(range.norm, (counts.get(range.norm) ?? 0) + 1)
  }
  return counts
}

function classifyToken(range: TokenRange, isSentenceStart: boolean): UncertaintyKind | null {
  const norm = range.norm
  if (!norm) return null
  if (NEGATION_TOKENS.has(norm)) return 'negation'
  if (TIME_LIKE_RE.test(norm) || DATETIME_TOKENS.has(norm)) return 'datetime'
  if (DIGITS_RE.test(norm) || NUMBER_TOKENS.has(norm)) return 'number'
  // Conservative "name or place" signal: a long capitalized token that is
  // NOT at sentence start (the Web Speech API usually capitalizes there).
  if (!isSentenceStart && range.raw.length >= 3 && UPPERCASE_START_RE.test(range.raw[0] ?? '')) {
    return 'name'
  }
  return 'other'
}

interface DiffResult {
  readonly alternativeViews: readonly AlternativeView[]
  readonly kinds: ReadonlySet<UncertaintyKind>
  readonly flaggedTokensByKind: ReadonlyMap<UncertaintyKind, readonly string[]>
  /** Uncertain words positioned inside the primary transcript string. */
  readonly primarySpans: readonly UncertainSpan[]
}

function normalizedKey(text: string): string {
  return text
    .trim()
    .replace(QUOTE_RE, '')
    .replace(PUNCT_RE, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

/**
 * Compare the primary transcript against the other alternatives, find the
 * words they disagree about, classify them, and collect highlight spans
 * (character positions relative to each transcript's own string).
 */
function computeDiffs(
  transcript: string,
  rawAlternatives: readonly SpeechAlternative[],
): DiffResult | null {
  const primaryKey = normalizedKey(transcript)
  const primaryRanges = tokenizeRanges(transcript)
  const primaryCounts = tokenCounts(primaryRanges)

  // Deduplicate alternatives and drop ones identical to the primary
  // transcript — identical text provides no disagreement evidence.
  const seen = new Set<string>([primaryKey])
  const others: SpeechAlternative[] = []
  for (const raw of rawAlternatives) {
    const trimmed = raw.transcript.trim()
    if (!trimmed) continue
    const key = normalizedKey(trimmed)
    if (seen.has(key)) continue
    seen.add(key)
    others.push({ transcript: trimmed, confidence: raw.confidence })
  }
  if (others.length === 0) return null

  const kinds = new Set<UncertaintyKind>()
  const flagged = new Map<UncertaintyKind, Set<string>>([
    ['negation', new Set()],
    ['number', new Set()],
    ['datetime', new Set()],
    ['name', new Set()],
  ])
  const primarySpans = new Map<string, UncertainSpan>()
  const alternativeViews: AlternativeView[] = []

  for (const alternative of others) {
    const altRanges = tokenizeRanges(alternative.transcript)
    const altCounts = tokenCounts(altRanges)

    // Tokens whose frequency differs between this alternative and the primary.
    const diffNorms = new Set<string>()
    for (const [token, count] of primaryCounts) {
      if (altCounts.get(token) !== count) diffNorms.add(token)
    }
    for (const [token, count] of altCounts) {
      if (primaryCounts.get(token) !== count) diffNorms.add(token)
    }

    const altSpans: UncertainSpan[] = []
    for (const range of altRanges) {
      if (!range.norm || !diffNorms.has(range.norm) || FILLER_TOKENS.has(range.norm)) continue
      const kind = classifyToken(range, range.start === 0)
      if (!kind || kind === 'other') continue
      kinds.add(kind)
      flagged.get(kind)?.add(range.norm)
      altSpans.push({ start: range.start, end: range.end, token: range.raw, kind })
    }

    // The primary side matters equally: a word the alternatives DROPPED
    // (e.g. a negation that vanished) exists only here and must count as
    // evidence too. Deduplicate spans — two alternatives may disagree
    // about the same primary token.
    for (const range of primaryRanges) {
      if (!range.norm || !diffNorms.has(range.norm) || FILLER_TOKENS.has(range.norm)) continue
      const kind = classifyToken(range, range.start === 0)
      if (!kind || kind === 'other') continue
      kinds.add(kind)
      flagged.get(kind)?.add(range.norm)
      primarySpans.set(`${range.start}:${range.end}`, {
        start: range.start,
        end: range.end,
        token: range.raw,
        kind,
      })
    }
    alternativeViews.push({
      transcript: alternative.transcript,
      confidence: alternative.confidence,
      spans: altSpans,
    })
  }

  if (kinds.size === 0) return null

  const flaggedTokensByKind = new Map<UncertaintyKind, string[]>()
  for (const [kind, tokens] of flagged) {
    if (tokens.size > 0) flaggedTokensByKind.set(kind, [...tokens])
  }

  return {
    alternativeViews,
    kinds,
    flaggedTokensByKind,
    primarySpans: [...primarySpans.values()],
  }
}

function describeTokens(kind: UncertaintyKind, tokens: readonly string[]): string {
  const shown = tokens
    .slice(0, 3)
    .map((token) => `"${token}"`)
    .join(', ')
  const suffix = tokens.length > 3 ? '…' : ''
  switch (kind) {
    case 'negation':
      return `a word that can change the meaning (${shown}${suffix}) — for example a negation like "not" or "nahi"`
    case 'number':
      return `a number (${shown}${suffix})`
    case 'datetime':
      return `a time or date word (${shown}${suffix})`
    case 'name':
      return `a possible name or place (${shown}${suffix})`
    default:
      return `a word (${shown}${suffix})`
  }
}

/**
 * Evaluate a final speech-recognition result together with the
 * (possibly missing) confidence and alternatives the engine reported.
 */
export function detectUncertainty(
  transcript: string,
  confidence?: number,
  rawAlternatives?: readonly SpeechAlternative[],
): UncertaintyFinding {
  const emptyFinding: UncertaintyFinding = {
    level: 'ok',
    reason: null,
    severity: 'low',
    transcript: transcript.trim(),
    uncertainSpans: [],
    alternatives: [],
  }

  const trimmed = transcript.trim()
  if (!trimmed) {
    return {
      ...emptyFinding,
      level: 'empty',
      transcript: '',
      reason: 'No speech was recognized. Please try speaking again.',
    }
  }

  const meaningful = trimmed.replace(ONLY_PUNCTUATION_RE, '')
  if (!meaningful) {
    return {
      ...emptyFinding,
      level: 'review',
      reason: 'What we heard was not usable speech. Please repeat your sentence.',
    }
  }

  const hasEngineConfidence =
    typeof confidence === 'number' && Number.isFinite(confidence) && confidence > 0
  const isLowConfidence = hasEngineConfidence && confidence < LOW_CONFIDENCE_THRESHOLD
  const diffs = computeDiffs(trimmed, rawAlternatives ?? [])

  // No evidence of any problem: keep the normal fast path.
  if (!diffs && !isLowConfidence) {
    return emptyFinding
  }

  // Review triggered by low confidence only: no word evidence to highlight.
  if (!diffs) {
    return {
      ...emptyFinding,
      level: 'review',
      severity: 'low',
      reason:
        'We may not have heard you clearly (reported confidence was low). Please correct the text below or repeat your sentence.',
    }
  }

  // The alternatives only disagree about words we deliberately do not flag,
  // so the result stays trustworthy and the normal fast path continues.
  if (diffs.kinds.size === 0) {
    return emptyFinding
  }

  const notes: string[] = []
  const negationTokens = diffs.flaggedTokensByKind.get('negation')
  if (negationTokens) {
    notes.push(`The alternatives differ about ${describeTokens('negation', negationTokens)}.`)
  }
  for (const kind of ['number', 'datetime', 'name'] as const) {
    const tokens = diffs.flaggedTokensByKind.get(kind)
    if (tokens) notes.push(`They also differ about ${describeTokens(kind, tokens)}.`)
  }
  const confidenceNote = isLowConfidence
    ? ' The recognition confidence was also low.'
    : hasEngineConfidence
      ? ''
      : ' (This browser engine did not report a confidence value.)'

  const reason =
    'Something in your sentence may not be recognized correctly. ' +
    notes.join(' ') +
    confidenceNote +
    ' Please check and correct the text below, then confirm before we translate.'

  return {
    ...emptyFinding,
    level: 'review',
    severity: diffs.kinds.has('negation') ? 'high' : 'low',
    reason,
    uncertainSpans: diffs.primarySpans,
    alternatives: diffs.alternativeViews,
  }
}

/**
 * Evaluate text that was never finalized by the engine (the user stopped
 * the recording while only interim results existed) — a genuinely
 * detectable "incomplete" case.
 */
export function evaluateUnfinalizedText(text: string): {
  level: UncertaintyLevel
  reason: string
} {
  if (!text.trim()) {
    return {
      level: 'empty',
      reason: 'Recording stopped with nothing recognized. Please speak again.',
    }
  }
  return {
    level: 'review',
    reason:
      'Recording stopped before your sentence was fully recognized. Please review and correct the text below, or repeat it.',
  }
}
