import { useRef, useState, useEffect } from 'react'
import {
  Clock,
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  Copy,
  Check,
  X,
  Loader2,
  Users,
} from 'lucide-react'
import {
  loadMessages,
  subscribeToRoom,
  leaveRoom,
  closeRoom,
  getMyUserId,
  type PairRoom,
  type PairMessage,
  type PairLanguage,
} from '../services/pairRoomService'
import { supabase } from '../lib/supabaseClient'
import { formatRoomCodeForDisplay } from '../lib/pairRoomCode'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { speakText, stopSpeaking, type SupportedTtsLang } from '../services/speechSynthesis'
import { ConfirmModal } from './ui/ConfirmModal'
import { Button } from './ui/Button'
import { cn } from '../lib/cn'

interface PairConnectConversationProps {
  room: PairRoom
  myRole: 'host' | 'peer'
  myLanguage: PairLanguage
  peerLanguage: PairLanguage
  onEndSession: () => void
}

function langToTts(lang: PairLanguage): SupportedTtsLang {
  if (lang.toLowerCase() === 'kannada') return 'kn'
  if (lang.toLowerCase() === 'hindi') return 'hi'
  return 'en'
}

function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

export function PairConnectConversation({
  room,
  myRole,
  myLanguage,
  peerLanguage,
  onEndSession,
}: PairConnectConversationProps) {
  const [messages, setMessages] = useState<PairMessage[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(true)
  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [presenceKeys, setPresenceKeys] = useState<string[]>([])
  const [myUserId, setMyUserId] = useState<string | null>(null)
  const [isEndConfirmOpen, setIsEndConfirmOpen] = useState(false)
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)

  const composerRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Web Speech recognition for voice dictation
  const {
    isListening,
    startListening,
    stopListening,
    isSupported: speechSupported,
  } = useSpeechRecognition({
    onTranscriptChange: (transcript) => setDraft(transcript),
    onFinalTranscript: (final) => setDraft(final),
    onError: () => undefined,
  })

  // Load user id, messages, and subscribe to room
  useEffect(() => {
    let isCancelled = false

    getMyUserId()
      .then((id) => {
        if (!isCancelled) setMyUserId(id)
      })
      .catch(() => undefined)

    loadMessages(room.id)
      .then((loaded) => {
        if (!isCancelled) {
          setMessages(loaded)
          setIsLoadingMessages(false)
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.error('Failed to load pair messages:', err)
          setIsLoadingMessages(false)
        }
      })

    const channel = subscribeToRoom(room.id, {
      onMessage: (newMsg) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev
          return [...prev, newMsg]
        })
      },
      onPresence: (keys) => {
        setPresenceKeys(keys)
      },
    })

    return () => {
      isCancelled = true
      leaveRoom(channel)
      stopSpeaking()
    }
  }, [room.id])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const isPeerOnline =
    (myUserId && presenceKeys.some((k) => k !== myUserId)) ||
    presenceKeys.length >= 2

  const toggleMic = () => {
    if (!speechSupported) return
    if (isListening) {
      stopListening()
    } else {
      startListening(myLanguage)
    }
  }

  const handleSend = async () => {
    const text = draft.trim()
    if (!text || isSending) return

    setIsSending(true)
    setSendError(null)

    try {
      const { error } = await supabase.functions.invoke('pair-message', {
        body: {
          room_id: room.id,
          text,
        },
      })

      if (error) {
        throw error
      }

      setDraft('')
      composerRef.current?.focus()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send message'
      setSendError(msg)
    } finally {
      setIsSending(false)
    }
  }

  const handleComposerKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void handleSend()
    }
  }

  const confirmEndSession = async () => {
    stopListening()
    stopSpeaking()
    setIsEndConfirmOpen(false)
    try {
      await closeRoom(room.id)
    } catch {
      // ignore
    }
    onEndSession()
  }

  const handlePlayAudio = (
    message: PairMessage,
    textToPlay: string,
    lang: PairLanguage,
    transliteration?: string | null,
  ) => {
    if (playingMessageId === message.id) {
      stopSpeaking()
      setPlayingMessageId(null)
      return
    }

    const ttsLang = langToTts(lang)
    const started = speakText(
      textToPlay,
      ttsLang,
      transliteration || undefined,
      () => setPlayingMessageId(message.id),
      () => setPlayingMessageId(null),
      () => setPlayingMessageId(null),
    )

    if (!started) {
      setPlayingMessageId(null)
    }
  }

  const handleCopy = async (message: PairMessage, textToCopy: string) => {
    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopiedMessageId(message.id)
      setTimeout(() => setCopiedMessageId(null), 2000)
    } catch {
      // ignore
    }
  }

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-forest-900 sm:text-4xl">
            Live Translation Room
          </h2>
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-ink-500">
            Messages are automatically translated bidirectional in real-time.
          </p>
        </div>
      </div>

      {/* Chat card */}
      <div className="mt-8 overflow-hidden rounded-3xl bg-white shadow-lifted ring-1 ring-forest-900/10">
        {/* Top bar: participants + room + presence status */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-forest-900/8 bg-canvas-50/80 px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-forest-100 px-3 py-1 text-xs font-semibold text-forest-900 ring-1 ring-forest-700/15">
              You · {myLanguage}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-canvas-100 px-3 py-1 text-xs font-semibold text-ink-700 ring-1 ring-forest-900/10">
              Partner · {peerLanguage}
            </span>
            <span className="rounded-full bg-canvas-100 px-3 py-1 text-[11px] font-semibold tracking-wider text-ink-500 ring-1 ring-forest-900/8">
              Room {formatRoomCodeForDisplay(room.code)}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Real Presence Status Indicator */}
            <div className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold ring-1 ring-forest-900/10 shadow-xs">
              <span
                className={cn(
                  'h-2 w-2 rounded-full',
                  isPeerOnline ? 'bg-emerald-500 animate-pulse' : 'bg-ink-400',
                )}
              />
              <span className={isPeerOnline ? 'text-emerald-900' : 'text-ink-500'}>
                {isPeerOnline ? 'Partner Online' : 'Partner Offline'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsEndConfirmOpen(true)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-rose-50 px-3.5 py-1.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100 transition-colors"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              <span>End Session</span>
            </button>
          </div>
        </div>

        {/* Messages scroll area */}
        <div className="flex max-h-[520px] min-h-[360px] flex-col gap-4 overflow-y-auto bg-canvas-100/40 px-5 py-6 sm:px-6">
          {isLoadingMessages ? (
            <div className="my-auto flex flex-col items-center justify-center text-ink-400 py-8">
              <Loader2 className="h-6 w-6 animate-spin text-forest-600 mb-2" />
              <p className="text-xs">Connecting to conversation...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="my-auto text-center py-10 px-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-100 text-forest-800 ring-1 ring-forest-700/15 mb-3">
                <Users className="h-6 w-6" />
              </div>
              <h4 className="font-semibold text-forest-900 text-sm">
                Room is ready!
              </h4>
              <p className="text-xs text-ink-500 mt-1 max-w-sm mx-auto">
                Type or dictate a message below. It will be instantly translated for your partner.
              </p>
            </div>
          ) : (
            messages.map((message) => {
              const isMe =
                (myUserId && message.sender_id === myUserId) ||
                (!myUserId && message.sender_role === myRole)
              const isPlaying = playingMessageId === message.id
              const isCopied = copiedMessageId === message.id
              const displayText = isMe ? message.original_text : message.translated_text
              const shouldShowTransliteration =
                !isMe &&
                (myLanguage === 'Kannada' || myLanguage === 'Hindi') &&
                Boolean(message.transliteration)

              return (
                <div
                  key={message.id}
                  className={cn(
                    'flex flex-col max-w-[85%] sm:max-w-[75%]',
                    isMe ? 'ml-auto items-end' : 'mr-auto items-start',
                  )}
                >
                  {/* Sender label */}
                  <span className="mb-1 text-[11px] font-semibold text-ink-400 px-1">
                    {isMe ? 'You' : 'Partner'}
                  </span>

                  {/* Message bubble */}
                  <div
                    className={cn(
                      'rounded-2xl p-4 shadow-soft transition-all ring-1',
                      isMe
                        ? 'bg-forest-800 text-white ring-forest-900/10 rounded-tr-xs'
                        : 'bg-white text-forest-950 ring-forest-900/10 rounded-tl-xs',
                    )}
                  >
                    {isMe ? (
                      /* My message: show original_text only (my own words, in my language) */
                      <div>
                        <p
                          className={cn(
                            'text-[15px] font-medium leading-relaxed',
                            myLanguage.toLowerCase() === 'kannada' && 'font-kannada text-lg',
                          )}
                        >
                          {displayText}
                        </p>
                      </div>
                    ) : (
                      /* Peer message: show translated_text ONLY, as the main text. */
                      <div>
                        <p
                          className={cn(
                            'text-[15px] font-semibold leading-relaxed text-forest-950',
                            myLanguage.toLowerCase() === 'kannada' &&
                              'font-kannada text-lg',
                          )}
                        >
                          {displayText}
                        </p>

                        {shouldShowTransliteration && (
                          <p className="mt-1 text-xs italic text-forest-700">
                            "{message.transliteration}"
                          </p>
                        )}
                      </div>
                    )}

                    {/* Bubble toolbar */}
                    <div
                      className={cn(
                        'mt-2.5 flex items-center justify-between gap-3 pt-1 text-[11px]',
                        isMe ? 'text-canvas-200/80' : 'text-ink-400',
                      )}
                    >
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatTime(message.created_at)}</span>
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            handlePlayAudio(
                              message,
                              displayText,
                              myLanguage,
                              shouldShowTransliteration ? message.transliteration : undefined,
                            )
                          }
                          title="Listen to pronunciation"
                          className={cn(
                            'p-1 rounded-md transition-colors cursor-pointer',
                            isMe
                              ? 'hover:bg-white/10 text-canvas-100'
                              : 'hover:bg-forest-50 text-forest-700',
                            isPlaying && 'animate-pulse text-emerald-400',
                          )}
                        >
                          {isPlaying ? (
                            <VolumeX className="h-3.5 w-3.5" />
                          ) : (
                            <Volume2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(message, displayText)}
                          title="Copy text"
                          className={cn(
                            'p-1 rounded-md transition-colors cursor-pointer',
                            isMe
                              ? 'hover:bg-white/10 text-canvas-100'
                              : 'hover:bg-forest-50 text-forest-700',
                          )}
                        >
                          {isCopied ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Composer */}
        <div className="border-t border-forest-900/8 bg-white px-4 py-4 sm:px-6">
          {sendError && (
            <p className="mb-2 text-xs font-semibold text-rose-600">
              ⚠️ {sendError}
            </p>
          )}

          <div className="flex items-end gap-2.5">
            <button
              type="button"
              onClick={toggleMic}
              disabled={!speechSupported || isSending}
              aria-label={isListening ? 'Stop voice input' : 'Dictate using microphone'}
              title={
                speechSupported
                  ? isListening
                    ? 'Stop voice input'
                    : `Dictate in ${myLanguage}`
                  : 'Voice input is not supported in this browser'
              }
              className={cn(
                'relative inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full ring-1 transition-all outline-offset-2 focus-visible:outline-2 focus-visible:outline-forest-600',
                isListening
                  ? 'bg-rose-600 text-white ring-2 ring-rose-400 ring-offset-2'
                  : 'bg-white text-ink-700 ring-ink-900/8 hover:bg-forest-50 hover:text-forest-800 disabled:cursor-not-allowed disabled:opacity-40',
              )}
            >
              {isListening ? (
                <MicOff className="h-[18px] w-[18px]" aria-hidden="true" />
              ) : (
                <Mic className="h-[18px] w-[18px]" aria-hidden="true" />
              )}
            </button>

            <label htmlFor="pair-composer" className="sr-only">
              Message ({myLanguage})
            </label>
            <textarea
              id="pair-composer"
              ref={composerRef}
              rows={1}
              value={draft}
              disabled={isSending}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              placeholder={
                isListening
                  ? `Listening in ${myLanguage}...`
                  : `Type a message in ${myLanguage}...`
              }
              className={cn(
                'max-h-32 min-h-[46px] flex-1 resize-none rounded-2xl border-0 bg-canvas-100 px-4 py-2.5',
                'text-[15px] leading-relaxed text-ink-900 ring-1 ring-forest-900/10',
                'placeholder:text-ink-400 outline-none transition-all',
                isListening
                  ? 'ring-2 ring-rose-500'
                  : 'focus:ring-2 focus:ring-forest-500 focus:bg-white',
              )}
            />

            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => void handleSend()}
              disabled={!draft.trim() || isSending}
              aria-label="Send message"
              className="h-11 shrink-0 gap-2 px-4 shadow-soft"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4" aria-hidden="true" />
                  <span className="sm:hidden">Send</span>
                </>
              )}
            </Button>
          </div>
          <p className="mt-2 text-center text-[11px] text-ink-400">
            Messages are automatically translated into {peerLanguage} for your partner.
          </p>
        </div>
      </div>

      {/* End Session Confirmation Modal */}
      <ConfirmModal
        isOpen={isEndConfirmOpen}
        title="End Pair Session?"
        message="This will close the translation room and disconnect both devices. Messages will no longer be exchanged."
        confirmText="End Session"
        cancelText="Stay Connected"
        variant="danger"
        onConfirm={() => void confirmEndSession()}
        onCancel={() => setIsEndConfirmOpen(false)}
      />
    </div>
  )
}
