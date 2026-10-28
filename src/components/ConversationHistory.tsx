import { useState, useEffect, useMemo } from 'react'
import {
  History,
  Search,
  Trash2,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Edit3,
  ArrowUpRight,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import {
  type ConversationEntry,
  type CorrectionPayload,
  getConversationEntries,
  deleteConversationEntry,
  clearAllConversationEntries,
  updateConversationCorrection,
  subscribeToHistory,
} from '../services/conversationStorage'
import { speakKannada, stopSpeaking } from '../services/speechSynthesis'
import { ConfirmModal } from './ui/ConfirmModal'
import { CorrectionModal } from './CorrectionModal'
import { IconButton } from './ui/IconButton'
import { Button } from './ui/Button'
import { cn } from '../lib/cn'

interface ConversationHistoryProps {
  onLoadEntry?: (entry: ConversationEntry) => void
}

type FilterStatus = 'all' | 'corrected' | 'original'

const CATEGORY_LABELS: Record<string, string> = {
  mistranslation: 'Mistranslation',
  grammar: 'Grammar & Phrasing',
  spelling: 'Spelling / Script',
  tone: 'Tone / Formality',
  incomplete: 'Incomplete',
  other: 'Other Refinement',
}

function formatTimestamp(ts: number): string {
  try {
    const d = new Date(ts)
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export function ConversationHistory({ onLoadEntry }: ConversationHistoryProps) {
  const [entries, setEntries] = useState<ConversationEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Modals state
  const [isClearModalOpen, setIsClearModalOpen] = useState(false)
  const [entryToDelete, setEntryToDelete] = useState<ConversationEntry | null>(null)
  const [editingEntry, setEditingEntry] = useState<ConversationEntry | null>(null)
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false)
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set())

  useEffect(() => {
    let isCancelled = false

    const fetchHistory = () => {
      getConversationEntries()
        .then((data) => {
          if (!isCancelled) {
            setEntries(data)
            setIsLoading(false)
          }
        })
        .catch((err: unknown) => {
          if (!isCancelled) {
            console.error('Failed to load conversation history:', err)
            setIsLoading(false)
          }
        })
    }

    fetchHistory()
    const unsubscribe = subscribeToHistory(fetchHistory)

    return () => {
      isCancelled = true
      unsubscribe()
      stopSpeaking()
    }
  }, [])

  // Filter & search logic
  const filteredEntries = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return entries.filter((entry) => {
      // Filter by status
      if (statusFilter === 'corrected' && entry.correctionStatus !== 'corrected') {
        return false
      }
      if (statusFilter === 'original' && entry.correctionStatus !== 'original') {
        return false
      }

      // Filter by search query
      if (!q) return true

      const matchSource = entry.sourceText.toLowerCase().includes(q)
      const matchInitial = entry.initialTranslation.kannada.toLowerCase().includes(q)
      const matchInitialTrans =
        entry.initialTranslation.transliteration?.toLowerCase().includes(q) ?? false
      const matchCorrected =
        entry.correctedTranslation?.kannada.toLowerCase().includes(q) ?? false
      const matchCorrectedTrans =
        entry.correctedTranslation?.transliteration?.toLowerCase().includes(q) ?? false
      const matchNotes = entry.correctedTranslation?.note?.toLowerCase().includes(q) ?? false

      return (
        matchSource ||
        matchInitial ||
        matchInitialTrans ||
        matchCorrected ||
        matchCorrectedTrans ||
        matchNotes
      )
    })
  }, [entries, searchQuery, statusFilter])

  // Audio playback handler
  const handlePlayAudio = (entry: ConversationEntry) => {
    if (playingId === entry.id) {
      stopSpeaking()
      setPlayingId(null)
      return
    }

    const textToSpeak =
      entry.correctedTranslation?.kannada || entry.initialTranslation.kannada
    const translitToSpeak =
      entry.correctedTranslation?.transliteration ||
      entry.initialTranslation.transliteration

    const started = speakKannada(
      textToSpeak,
      translitToSpeak,
      () => setPlayingId(entry.id),
      () => setPlayingId(null),
      () => setPlayingId(null),
    )

    if (!started) {
      setPlayingId(null)
    }
  }

  // Copy handler
  const handleCopy = async (entry: ConversationEntry) => {
    const kannada =
      entry.correctedTranslation?.kannada || entry.initialTranslation.kannada
    const translit =
      entry.correctedTranslation?.transliteration ||
      entry.initialTranslation.transliteration
    const textToCopy = translit ? `${kannada}\n(${translit})` : kannada

    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopiedId(entry.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      console.warn('Failed to copy translation text')
    }
  }

  // Delete single entry
  const handleDelete = async (id: string) => {
    if (playingId === id) {
      stopSpeaking()
      setPlayingId(null)
    }
    await deleteConversationEntry(id)
  }

  // Confirmed delete of a single entry (See ConfirmModal below)
  const handleConfirmDeleteEntry = async () => {
    if (!entryToDelete) return
    await handleDelete(entryToDelete.id)
    setEntryToDelete(null)
  }

  // Clear all
  const handleConfirmClear = async () => {
    stopSpeaking()
    setPlayingId(null)
    await clearAllConversationEntries()
    setIsClearModalOpen(false)
  }

  // Edit / Correct entry
  const handleOpenCorrection = (entry: ConversationEntry) => {
    setEditingEntry(entry)
    setIsCorrectionModalOpen(true)
  }

  const handleSaveCorrection = async (id: string, payload: CorrectionPayload) => {
    await updateConversationCorrection(id, payload)
  }

  // Toggle card details expand
  const toggleExpand = (id: string) => {
    setExpandedEntries((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <section id="history" className="scroll-mt-24 py-12 sm:py-16">
      <div className="mx-auto max-w-4xl px-5 sm:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-2 text-[13px] font-semibold tracking-[0.14em] text-forest-500 uppercase">
              <History className="h-4 w-4" aria-hidden="true" />
              Conversation Replay & Correction Trail
            </span>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-forest-900 sm:text-3xl">
              Recent Translations & Corrections
            </h2>
            <p className="mt-1 text-sm text-ink-500 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600 inline shrink-0" />
              <span>
                Saved locally in your browser. Data is never shared or uploaded to any server.
              </span>
            </p>
          </div>

          {entries.length > 0 && (
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setIsClearModalOpen(true)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 ring-1 ring-rose-200 transition-colors"
                title="Clear all conversation history"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear All</span>
              </button>
            </div>
          )}
        </div>

        {/* Controls: Search & Filter Tabs */}
        {entries.length > 0 && (
          <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search spoken text, Kannada, transliteration..."
                className="w-full rounded-2xl border-0 bg-white/80 pl-10 pr-4 py-2.5 text-sm text-ink-900 ring-1 ring-forest-900/10 placeholder:text-ink-400 focus:bg-white focus:ring-2 focus:ring-forest-600 outline-none transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute top-1/2 right-3.5 -translate-y-1/2 text-xs font-semibold text-ink-400 hover:text-ink-700 p-1"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1.5 rounded-2xl bg-canvas-200/60 p-1 ring-1 ring-forest-900/8 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={cn(
                  'cursor-pointer rounded-xl px-3 py-1.5 text-xs font-medium transition-all',
                  statusFilter === 'all'
                    ? 'bg-white text-forest-900 font-semibold shadow-soft ring-1 ring-forest-900/6'
                    : 'text-ink-500 hover:text-ink-900',
                )}
              >
                All ({entries.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('corrected')}
                className={cn(
                  'cursor-pointer rounded-xl px-3 py-1.5 text-xs font-medium transition-all',
                  statusFilter === 'corrected'
                    ? 'bg-white text-emerald-800 font-semibold shadow-soft ring-1 ring-emerald-600/20'
                    : 'text-ink-500 hover:text-ink-900',
                )}
              >
                Corrected ({entries.filter((e) => e.correctionStatus === 'corrected').length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('original')}
                className={cn(
                  'cursor-pointer rounded-xl px-3 py-1.5 text-xs font-medium transition-all',
                  statusFilter === 'original'
                    ? 'bg-white text-forest-900 font-semibold shadow-soft ring-1 ring-forest-900/6'
                    : 'text-ink-500 hover:text-ink-900',
                )}
              >
                Original ({entries.filter((e) => e.correctionStatus === 'original').length})
              </button>
            </div>
          </div>
        )}

        {/* Entries list or empty states */}
        <div className="mt-6 space-y-4">
          {isLoading ? (
            <div className="rounded-3xl bg-white/60 p-10 text-center ring-1 ring-forest-900/6">
              <p className="text-sm text-ink-400">Loading conversation history...</p>
            </div>
          ) : entries.length === 0 ? (
            /* Empty state: No history at all */
            <div className="rounded-3xl bg-white/75 p-10 text-center ring-1 ring-forest-900/8 shadow-soft">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-50 text-forest-700 ring-1 ring-forest-900/10">
                <History className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-forest-900">
                No conversation history yet
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-ink-500 leading-relaxed">
                When you translate voice or text above, your conversations and corrections will appear
                here for replay and comparison.
              </p>
              <div className="mt-6">
                <a href="#translator">
                  <Button variant="secondary" size="md">
                    <Sparkles className="h-4 w-4 text-forest-600" />
                    Try translating a sentence
                  </Button>
                </a>
              </div>
            </div>
          ) : filteredEntries.length === 0 ? (
            /* Empty state: No matching search results */
            <div className="rounded-3xl bg-white/75 p-8 text-center ring-1 ring-forest-900/8">
              <p className="text-sm font-medium text-forest-900">
                No conversations match your search or filter.
              </p>
              <p className="mt-1 text-xs text-ink-400">
                Try searching with different terms or resetting the filter.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  setStatusFilter('all')
                }}
                className="mt-4 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold text-forest-700 bg-forest-50 hover:bg-forest-100 ring-1 ring-forest-900/10 cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                Reset filters
              </button>
            </div>
          ) : (
            /* History List */
            filteredEntries.map((entry) => {
              const isCorrected = entry.correctionStatus === 'corrected'
              const isPlayingThis = playingId === entry.id
              const isCopiedThis = copiedId === entry.id
              const isExpanded = expandedEntries.has(entry.id)

              return (
                <article
                  key={entry.id}
                  className={cn(
                    'overflow-hidden rounded-3xl bg-white/85 p-5 sm:p-6 shadow-soft ring-1 transition-all duration-200',
                    isCorrected
                      ? 'ring-emerald-700/20 hover:ring-emerald-700/35'
                      : 'ring-forest-900/10 hover:ring-forest-900/20',
                  )}
                >
                  {/* Top Bar: Timestamp, Language Pair, Correction Status Badge */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-forest-900/6 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-forest-900/5 px-2.5 py-0.5 text-xs font-semibold text-forest-800">
                        {entry.sourceLanguage} → {entry.targetLanguage}
                      </span>
                      <span className="text-xs text-ink-400">
                        {formatTimestamp(entry.timestamp)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isCorrected ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-500/20">
                          <Check className="h-3 w-3" />
                          Corrected
                          {entry.errorCategory && (
                            <span className="text-emerald-700/80 font-normal">
                              ({CATEGORY_LABELS[entry.errorCategory] || entry.errorCategory})
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="rounded-full bg-canvas-200/60 px-2 py-0.5 text-xs font-medium text-ink-500">
                          Original AI
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Main content: Source and Translations */}
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Source Text Box */}
                    <div className="rounded-2xl bg-canvas-100/70 p-3.5 ring-1 ring-forest-900/6">
                      <span className="text-[11px] font-semibold tracking-wider text-ink-400 uppercase">
                        Spoken / Written ({entry.sourceLanguage})
                      </span>
                      <p className="mt-1.5 text-sm font-medium text-ink-900 leading-relaxed">
                        "{entry.sourceText}"
                      </p>
                    </div>

                    {/* Output & Trail Comparison Box */}
                    <div
                      className={cn(
                        'rounded-2xl p-3.5 ring-1 space-y-3',
                        isCorrected
                          ? 'bg-emerald-50/40 ring-emerald-700/15'
                          : 'bg-forest-900/[0.03] ring-forest-900/6',
                      )}
                    >
                      {/* If corrected, show Correction Trail Comparison */}
                      {isCorrected && entry.correctedTranslation ? (
                        <>
                          {/* Active / Corrected Translation */}
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-semibold tracking-wider text-emerald-800 uppercase flex items-center gap-1">
                                <Sparkles className="h-3 w-3" />
                                Corrected Translation (Active)
                              </span>
                            </div>
                            <p className="mt-1 font-kannada text-base font-semibold text-forest-900 leading-relaxed">
                              {entry.correctedTranslation.kannada}
                            </p>
                            {entry.correctedTranslation.transliteration && (
                              <p className="mt-0.5 text-xs italic text-forest-700">
                                "{entry.correctedTranslation.transliteration}"
                              </p>
                            )}
                            {entry.correctedTranslation.note && (
                              <p className="mt-1.5 text-xs text-ink-500 bg-white/70 px-2.5 py-1 rounded-lg">
                                <strong className="font-semibold text-ink-700">Note: </strong>
                                {entry.correctedTranslation.note}
                              </p>
                            )}
                          </div>

                          {/* Preserved Initial Translation Trail */}
                          <div className="border-t border-emerald-700/10 pt-2.5">
                            <span className="text-[11px] font-semibold tracking-wider text-ink-400 uppercase">
                              Initial AI Translation (Preserved)
                            </span>
                            <p className="mt-0.5 font-kannada text-sm text-ink-500 line-through decoration-ink-400/60">
                              {entry.initialTranslation.kannada}
                            </p>
                            {entry.initialTranslation.transliteration && (
                              <p className="text-[11px] italic text-ink-400">
                                "{entry.initialTranslation.transliteration}"
                              </p>
                            )}
                          </div>
                        </>
                      ) : (
                        /* Uncorrected: Single Translation */
                        <div>
                          <span className="text-[11px] font-semibold tracking-wider text-forest-600 uppercase">
                            Kannada Translation
                          </span>
                          <p className="mt-1 font-kannada text-base font-semibold text-forest-900 leading-relaxed">
                            {entry.initialTranslation.kannada}
                          </p>
                          {entry.initialTranslation.transliteration && (
                            <p className="mt-0.5 text-xs italic text-forest-700">
                              "{entry.initialTranslation.transliteration}"
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-forest-900/6 pt-3">
                    <div className="flex items-center gap-1.5">
                      {/* Play audio */}
                      <IconButton
                        label={isPlayingThis ? 'Stop audio' : 'Replay Kannada voice'}
                        icon={isPlayingThis ? VolumeX : Volume2}
                        onClick={() => handlePlayAudio(entry)}
                        className={cn(
                          isPlayingThis &&
                            'bg-emerald-100 text-emerald-800 ring-2 ring-emerald-500 animate-pulse',
                        )}
                      />

                      {/* Copy */}
                      <IconButton
                        label={isCopiedThis ? 'Copied' : 'Copy translation'}
                        icon={isCopiedThis ? Check : Copy}
                        onClick={() => void handleCopy(entry)}
                        className={cn(isCopiedThis && 'bg-emerald-100 text-emerald-800')}
                      />

                      {/* Correct / Edit button */}
                      <button
                        type="button"
                        onClick={() => handleOpenCorrection(entry)}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-forest-800 bg-white ring-1 ring-forest-900/12 hover:bg-forest-50 hover:ring-forest-900/20 transition-all shadow-xs"
                        title={isCorrected ? 'Edit your correction' : 'Correct this translation'}
                      >
                        <Edit3 className="h-3 w-3 text-forest-600" />
                        <span>{isCorrected ? 'Edit Correction' : 'Correct'}</span>
                      </button>

                      {/* Restore / Load into Translator */}
                      {onLoadEntry && (
                        <button
                          type="button"
                          onClick={() => onLoadEntry(entry)}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-ink-700 hover:text-forest-900 hover:bg-forest-900/5 transition-colors"
                          title="Load this conversation back into the translator"
                        >
                          <ArrowUpRight className="h-3.5 w-3.5" />
                          <span>Load into Translator</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Details toggle */}
                      <button
                        type="button"
                        onClick={() => toggleExpand(entry.id)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-400 hover:text-ink-700 transition-colors cursor-pointer"
                        aria-expanded={isExpanded}
                      >
                        <span>{isExpanded ? 'Less' : 'Details'}</span>
                        {isExpanded ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => setEntryToDelete(entry)}
                        aria-label="Delete entry"
                        title="Delete entry"
                        className="rounded-full p-1.5 text-ink-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded metadata drawer */}
                  {isExpanded && (
                    <div className="mt-3 rounded-2xl bg-canvas-100/60 p-3.5 text-xs text-ink-500 border border-forest-900/6 space-y-1.5">
                      <p>
                        <strong className="text-ink-700">Record ID:</strong>{' '}
                        <code className="text-[11px] text-ink-400">{entry.id}</code>
                      </p>
                      <p>
                        <strong className="text-ink-700">Created:</strong>{' '}
                        {new Date(entry.timestamp).toLocaleString()}
                      </p>
                      {entry.updatedAt && (
                        <p>
                          <strong className="text-ink-700">Last Corrected:</strong>{' '}
                          {new Date(entry.updatedAt).toLocaleString()}
                        </p>
                      )}
                      <p>
                        <strong className="text-ink-700">Translation engine:</strong> Gemini
                        (gemini-3.5-flash-lite)
                      </p>
                    </div>
                  )}
                </article>
              )
            })
          )}
        </div>
      </div>

      {/* Single Entry Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={entryToDelete !== null}
        title="Delete This Conversation?"
        message={`The translation and its correction trail for "${
          entryToDelete
            ? entryToDelete.sourceText.length > 60
              ? `${entryToDelete.sourceText.slice(0, 60)}…`
              : entryToDelete.sourceText
            : ''
        }" will be permanently removed from your history. This action cannot be undone.`}
        confirmText="Yes, Delete Entry"
        cancelText="Keep Entry"
        variant="danger"
        onConfirm={() => void handleConfirmDeleteEntry()}
        onCancel={() => setEntryToDelete(null)}
      />

      {/* Clear All Confirmation Modal */}
      <ConfirmModal
        isOpen={isClearModalOpen}
        title="Clear Conversation History?"
        message="Are you sure you want to delete all saved conversation history and corrections? This action cannot be undone."
        confirmText="Yes, Clear All"
        cancelText="Keep History"
        variant="danger"
        onConfirm={() => void handleConfirmClear()}
        onCancel={() => setIsClearModalOpen(false)}
      />

      {/* Correction Modal */}
      <CorrectionModal
        entry={editingEntry}
        isOpen={isCorrectionModalOpen}
        onClose={() => {
          setIsCorrectionModalOpen(false)
          setEditingEntry(null)
        }}
        onSave={handleSaveCorrection}
      />
    </section>
  )
}
