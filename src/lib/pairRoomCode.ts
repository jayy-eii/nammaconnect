/**
 * Pair Connect Mode — shared frontend primitives (Phase 1).
 *
 * This module intentionally contains NO backend calls. Room codes are
 * generated locally so the Create/Join screens can be designed and demoed;
 * a real room registry arrives in Phase 2 and these helpers will then be
 * backed by API calls without changing their shapes.
 */

export type PairLanguage = 'Kannada' | 'English' | 'Hindi'

/** Languages a participant can pick as the language they speak. */
export const PAIR_LANGUAGES: readonly PairLanguage[] = ['Kannada', 'English', 'Hindi']

/** Unambiguous alphabet for room codes: no I/1/L/0/O confusion when read aloud. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 6
/** Optional spoken prefix shown on screen: "NC-XXXXXX". */
export const ROOM_CODE_PREFIX = 'NC-'

/**
 * Generates a new random room code locally (e.g. "4D9XK2").
 * Uses crypto.getRandomValues when available; falls back to Math.random.
 */
export function generateRoomCode(): string {
  const bytes = new Uint32Array(CODE_LENGTH)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < CODE_LENGTH; i++) {
      bytes[i] = Math.floor(Math.random() * 0x100000000)
    }
  }

  let code = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length]
  }
  return code
}

/** Uppercase, alphanumerics-only version of a raw user input. */
export function normalizeRoomCodeInput(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

/**
 * Basic formatting validation only — checks a normalized input against the
 * generator's shape, with or without the "NC" prefix. This does NOT verify
 * that a room exists; the real registry check belongs to Phase 2.
 */
export function isValidRoomCodeFormat(normalized: string): boolean {
  const pattern = new RegExp(`^(NC)?[${CODE_ALPHABET}]{${CODE_LENGTH}}$`)
  return pattern.test(normalized)
}

/** Strips the optional "NC" prefix when the input carries it. */
export function extractRoomCode(normalized: string): string {
  if (normalized.length === CODE_LENGTH + 2 && normalized.startsWith('NC')) {
    return normalized.slice(2)
  }
  return normalized
}

/** Formatted display form: "NC-4D9XK2". */
export function formatRoomCodeForDisplay(code: string): string {
  return `${ROOM_CODE_PREFIX}${code}`
}
