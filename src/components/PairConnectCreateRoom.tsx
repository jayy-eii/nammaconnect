import { useState, useEffect, useRef } from 'react'
import {
  ArrowLeft,
  Check,
  Copy,
  KeyRound,
  RotateCw,
  Share2,
  Loader2,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import {
  createRoom,
  subscribeToRoom,
  leaveRoom,
  type PairRoom,
  type PairLanguage,
} from '../services/pairRoomService'
import { formatRoomCodeForDisplay, PAIR_LANGUAGES } from '../lib/pairRoomCode'
import { Button } from './ui/Button'
import { Notice } from './ui/Notice'

interface PairConnectCreateRoomProps {
  myLanguage: PairLanguage
  onMyLanguageChange: (language: PairLanguage) => void
  onRoomCreated: (room: PairRoom) => void
  onRoomActive: (room: PairRoom) => void
  onBack: () => void
  onBackHome: () => void
}

export function PairConnectCreateRoom({
  myLanguage,
  onMyLanguageChange,
  onRoomCreated,
  onRoomActive,
  onBack,
  onBackHome,
}: PairConnectCreateRoomProps) {
  const [room, setRoom] = useState<PairRoom | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Track latest active callback
  const onRoomActiveRef = useRef(onRoomActive)
  onRoomActiveRef.current = onRoomActive

  const initializeRoom = async (lang: PairLanguage) => {
    setIsLoading(true)
    setError(null)
    try {
      const newRoom = await createRoom(lang)
      setRoom(newRoom)
      onRoomCreated(newRoom)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create room'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  // Create room on mount
  useEffect(() => {
    void initializeRoom(myLanguage)
    // Only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Subscribe to room updates until status becomes 'active'
  useEffect(() => {
    if (!room?.id) return

    const channel = subscribeToRoom(room.id, {
      onRoomUpdate: (updated) => {
        setRoom(updated)
        if (updated.status === 'active') {
          onRoomActiveRef.current(updated)
        }
      },
    })

    return () => {
      leaveRoom(channel)
    }
  }, [room?.id])

  const copyRoomCode = async () => {
    if (!room?.code) return
    try {
      await navigator.clipboard.writeText(formatRoomCodeForDisplay(room.code))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard unavailable
    }
  }

  const shareRoomCode = async () => {
    if (!room?.code) return
    const formatted = formatRoomCodeForDisplay(room.code)
    const joinUrl = `${window.location.origin}/#pair-connect?join=${room.code}`
    const shareText = `Join my NammaConnect translation room with code ${formatted}: ${joinUrl}`
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({
          title: 'NammaConnect Pair Room',
          text: shareText,
          url: joinUrl,
        })
        return
      }
      await navigator.clipboard.writeText(joinUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Share cancelled
    }
  }

  const handleLanguageSelect = (lang: PairLanguage) => {
    onMyLanguageChange(lang)
    void initializeRoom(lang)
  }

  const qrUrl = room?.code
    ? `${window.location.origin}/#pair-connect?join=${room.code}`
    : ''

  return (
    <div className="animate-fade-up">
      <div className="text-center">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-forest-900 sm:text-4xl">
          Create a Translation Room
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-[15px] leading-relaxed text-ink-500">
          Share your room code or QR code with the person you want to talk with.
          When they join, your conversation starts automatically.
        </p>
      </div>

      <div className="mt-8 overflow-hidden rounded-3xl bg-white shadow-lifted ring-1 ring-forest-900/10">
        <div className="p-6 sm:p-8">
          {error && (
            <div className="mb-6">
              <Notice tone="error">{error}</Notice>
            </div>
          )}

          {/* Language selector */}
          <div className="max-w-md mx-auto">
            <label
              htmlFor="pair-my-language"
              className="mb-1.5 block text-center text-xs font-semibold tracking-wider uppercase text-ink-500"
            >
              Your spoken language
            </label>
            <div className="relative">
              <select
                id="pair-my-language"
                value={myLanguage}
                disabled={isLoading}
                onChange={(e) => handleLanguageSelect(e.target.value as PairLanguage)}
                className="w-full cursor-pointer appearance-none rounded-xl bg-canvas-50 px-4 py-3 text-sm font-semibold text-forest-900 ring-1 ring-forest-900/12 outline-none focus:ring-2 focus:ring-forest-500 transition-all text-center"
              >
                {PAIR_LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="my-12 flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-forest-700" />
              <p className="mt-3 text-sm font-medium text-ink-500">
                Generating your secure room...
              </p>
            </div>
          ) : room ? (
            <div className="mt-8 grid grid-cols-1 items-center gap-6 sm:grid-cols-[1.2fr_0.8fr]">
              {/* Room code display */}
              <div className="rounded-3xl bg-canvas-100/80 p-5 sm:p-7 ring-1 ring-forest-900/8 text-center flex flex-col justify-between">
                <div>
                  <span className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.14em] text-ink-500 uppercase">
                    <KeyRound className="h-4 w-4 text-forest-600" aria-hidden="true" />
                    Room Code
                  </span>
                  <p
                    id="pair-room-code"
                    className="mt-3 font-display text-4xl font-semibold tracking-[0.18em] text-forest-900 sm:text-5xl"
                  >
                    {formatRoomCodeForDisplay(room.code)}
                  </p>

                  <div className="mt-3 flex items-center justify-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-xs font-medium text-amber-900">
                      Waiting for partner to join...
                    </span>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => void copyRoomCode()}
                    className="gap-2"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" aria-hidden="true" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" aria-hidden="true" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </Button>
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => void shareRoomCode()}
                    className="gap-2"
                  >
                    <Share2 className="h-4 w-4 text-forest-700" aria-hidden="true" />
                    <span>Share Link</span>
                  </Button>
                  <button
                    type="button"
                    onClick={() => void initializeRoom(myLanguage)}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold text-forest-800 hover:bg-forest-50 transition-colors outline-offset-2 focus-visible:outline-2 focus-visible:outline-forest-600"
                    title="Create a fresh room"
                  >
                    <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>New Room</span>
                  </button>
                </div>
              </div>

              {/* Real QR Code Tile */}
              <div className="rounded-3xl bg-forest-900 p-6 text-center shadow-soft flex flex-col items-center">
                <div className="rounded-2xl bg-white p-3.5 shadow-md flex items-center justify-center">
                  <QRCodeSVG
                    value={qrUrl}
                    size={160}
                    level="M"
                    fgColor="#173D2D"
                    bgColor="#FFFFFF"
                  />
                </div>
                <p className="mt-3 text-xs font-semibold text-canvas-50">
                  Scan to Join
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-canvas-200/80">
                  Point another phone's camera at this QR code to join instantly.
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Action footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-forest-900/8 bg-canvas-100/60 px-6 py-4 sm:px-8">
          <Button variant="secondary" size="md" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4 text-forest-700" aria-hidden="true" />
            <span>Join with Code instead</span>
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
