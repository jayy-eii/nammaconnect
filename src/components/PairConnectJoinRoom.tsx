import { useState, type FormEvent, type ChangeEvent } from 'react'
import {
  ArrowLeft,
  KeyRound,
  Loader2,
  ScanLine,
  Languages,
} from 'lucide-react'
import {
  joinRoom,
  type PairRoom,
  type PairLanguage,
} from '../services/pairRoomService'
import {
  formatRoomCodeForDisplay,
  isValidRoomCodeFormat,
  normalizeRoomCodeInput,
  extractRoomCode,
  PAIR_LANGUAGES,
} from '../lib/pairRoomCode'
import { Button } from './ui/Button'
import { Notice } from './ui/Notice'
import { cn } from '../lib/cn'

interface PairConnectJoinRoomProps {
  initialCode?: string
  myLanguage: PairLanguage
  onMyLanguageChange: (lang: PairLanguage) => void
  onRoomJoined: (room: PairRoom) => void
  onBack: () => void
  onBackHome: () => void
}

export function PairConnectJoinRoom({
  initialCode = '',
  myLanguage,
  onMyLanguageChange,
  onRoomJoined,
  onBack,
  onBackHome,
}: PairConnectJoinRoomProps) {
  const [rawInput, setRawInput] = useState(initialCode)
  const [prevInitialCode, setPrevInitialCode] = useState(initialCode)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isJoining, setIsJoining] = useState(false)
  const [qrNotice, setQrNotice] = useState<string | null>(null)

  if (initialCode !== prevInitialCode) {
    setPrevInitialCode(initialCode)
    setRawInput(initialCode)
  }

  const normalizedCode = normalizeRoomCodeInput(rawInput)
  const isFormatValid = isValidRoomCodeFormat(normalizedCode)

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setRawInput(event.target.value)
    if (validationError) setValidationError(null)
  }

  const handleJoin = async (event?: FormEvent) => {
    event?.preventDefault()
    setValidationError(null)
    setQrNotice(null)

    if (!rawInput.trim()) {
      setValidationError('Please enter a room code first.')
      return
    }

    if (!isFormatValid) {
      setValidationError(
        `Room codes are 6 characters like ${formatRoomCodeForDisplay('X4K9P2')} — letters and numbers only.`,
      )
      return
    }

    const cleanCode = extractRoomCode(normalizedCode)
    setIsJoining(true)

    try {
      const room = await joinRoom(cleanCode, myLanguage)
      onRoomJoined(room)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to join room. Please try again.'
      setValidationError(msg)
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <div className="animate-fade-up">
      <div className="text-center">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-forest-900 sm:text-4xl">
          Join with a Room Code
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-[15px] leading-relaxed text-ink-500">
          Enter the code your partner shared with you, pick the language you speak, and start chatting.
        </p>
      </div>

      <div className="mt-8 overflow-hidden rounded-3xl bg-white shadow-lifted ring-1 ring-forest-900/10">
        <div className="p-6 sm:p-8">
          {validationError && (
            <div className="mb-6">
              <Notice tone="error">{validationError}</Notice>
            </div>
          )}

          {qrNotice && (
            <div className="mb-6">
              <Notice tone="attention">{qrNotice}</Notice>
            </div>
          )}

          {/* Language selector */}
          <div className="mb-6">
            <label
              htmlFor="pair-join-language"
              className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase text-ink-500"
            >
              <Languages className="h-3.5 w-3.5 text-forest-600" />
              <span>Language you speak</span>
            </label>
            <select
              id="pair-join-language"
              value={myLanguage}
              disabled={isJoining}
              onChange={(e) => onMyLanguageChange(e.target.value as PairLanguage)}
              className="w-full cursor-pointer appearance-none rounded-xl bg-canvas-50 px-4 py-3 text-sm font-semibold text-forest-900 ring-1 ring-forest-900/12 outline-none focus:ring-2 focus:ring-forest-500 transition-all"
            >
              {PAIR_LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>

          {/* Code entry form */}
          <form onSubmit={handleJoin} className="mt-4" noValidate>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <div>
                <label
                  htmlFor="pair-room-code-input"
                  className="mb-1.5 inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.12em] text-ink-500 uppercase"
                >
                  <KeyRound className="h-4 w-4 text-forest-600" aria-hidden="true" />
                  Room code
                </label>
                <input
                  id="pair-room-code-input"
                  type="text"
                  inputMode="text"
                  autoComplete="off"
                  spellCheck={false}
                  value={rawInput}
                  onChange={handleInputChange}
                  placeholder="NC-XXXXXX"
                  maxLength={10}
                  disabled={isJoining}
                  aria-invalid={validationError !== null}
                  className={cn(
                    'w-full rounded-xl bg-canvas-50 px-4 py-3',
                    'font-display text-lg font-semibold tracking-[0.14em] uppercase text-forest-900',
                    'ring-1 outline-none transition-all',
                    'placeholder:font-sans placeholder:font-normal placeholder:tracking-normal placeholder:text-ink-400',
                    validationError
                      ? 'ring-2 ring-ruby-500'
                      : 'ring-forest-900/12 focus:ring-2 focus:ring-forest-500',
                  )}
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={isJoining || !rawInput.trim()}
                className={cn('gap-2 h-12 px-7', isJoining && 'cursor-wait opacity-80')}
              >
                {isJoining ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>Joining...</span>
                  </>
                ) : (
                  'Join Room'
                )}
              </Button>
            </div>
          </form>

          {/* QR scanner placeholder */}
          <div className="mt-6 pt-6 border-t border-forest-900/8 text-center">
            <button
              type="button"
              onClick={() =>
                setQrNotice(
                  'Camera scanner shortcut: point your device camera at the partner’s QR code to open the link directly in your browser!',
                )
              }
              className="inline-flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-forest-800 bg-forest-50 hover:bg-forest-100 ring-1 ring-forest-900/8 transition-colors"
            >
              <ScanLine className="h-3.5 w-3.5 text-forest-600" />
              <span>Have a QR code to scan?</span>
            </button>
          </div>
        </div>

        {/* Action footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-forest-900/8 bg-canvas-100/60 px-6 py-4 sm:px-8">
          <Button variant="secondary" size="md" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4 text-forest-700" aria-hidden="true" />
            <span>Create a Room instead</span>
          </Button>
          <button
            type="button"
            onClick={onBackHome}
            className="inline-flex cursor-pointer items-center rounded-full px-4 py-2 text-sm font-semibold text-forest-800 hover:bg-forest-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
