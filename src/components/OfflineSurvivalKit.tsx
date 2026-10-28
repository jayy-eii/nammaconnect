import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Wifi,
  WifiOff,
  Download,
  Trash2,
  Search,
  Maximize2,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Hospital,
  Ambulance,
  BusFront,
  MapPin,
  ShoppingBag,
  Tag,
  UtensilsCrossed,
  Coffee,
  HardDrive,
  ShieldAlert,
  RotateCcw,
  Sparkles,
  ArrowRight,
  BookmarkCheck,
  CheckCircle2,
} from 'lucide-react'
import {
  type PhraseCategory,
  type OfflinePhrase,
  OFFLINE_PHRASE_PACKS,
  getPackById,
} from '../data/offlinePhrases.ts'
import {
  getDownloadedPackIds,
  downloadPack,
  downloadAllPacks,
  deletePack,
  subscribeToPackUpdates,
  getTotalStorageSizeKb,
  isAudioCached,
} from '../services/offlineStorage.ts'
import { speakKannada, stopSpeaking } from '../services/speechSynthesis'
import { ShowToSomeoneModal } from './ShowToSomeoneModal'
import { ConfirmModal } from './ui/ConfirmModal'
import { IconButton } from './ui/IconButton'
import { Button } from './ui/Button'
import { cn } from '../lib/cn'

interface CategoryVisualConfig {
  primaryIcon: typeof Hospital
  secondaryIcon: typeof Ambulance
  accentName: string
  bgTint: string
  borderRing: string
  iconBg: string
  iconColor: string
  badgeBg: string
  badgeText: string
  gradientHeader: string
}

const CATEGORY_CONFIG: Record<PhraseCategory, CategoryVisualConfig> = {
  emergency: {
    primaryIcon: Hospital,
    secondaryIcon: Ambulance,
    accentName: 'Emergency & Medical',
    bgTint: 'bg-rose-50/50 hover:bg-rose-50/80',
    borderRing: 'ring-rose-400/30 hover:ring-rose-500/50',
    iconBg: 'bg-rose-100 ring-rose-200',
    iconColor: 'text-rose-700',
    badgeBg: 'bg-rose-100/90 text-rose-800 ring-rose-300/60',
    badgeText: 'Emergency',
    gradientHeader: 'from-rose-500/12 via-rose-500/4 to-transparent',
  },
  transport: {
    primaryIcon: BusFront,
    secondaryIcon: MapPin,
    accentName: 'Transport & Routes',
    bgTint: 'bg-amber-50/50 hover:bg-amber-50/80',
    borderRing: 'ring-amber-400/30 hover:ring-amber-500/50',
    iconBg: 'bg-amber-100 ring-amber-200',
    iconColor: 'text-amber-800',
    badgeBg: 'bg-amber-100/90 text-amber-900 ring-amber-300/60',
    badgeText: 'Bus & Auto',
    gradientHeader: 'from-amber-500/12 via-amber-500/4 to-transparent',
  },
  shopping: {
    primaryIcon: ShoppingBag,
    secondaryIcon: Tag,
    accentName: 'Markets & Stores',
    bgTint: 'bg-emerald-50/50 hover:bg-emerald-50/80',
    borderRing: 'ring-emerald-400/30 hover:ring-emerald-500/50',
    iconBg: 'bg-emerald-100 ring-emerald-200',
    iconColor: 'text-emerald-800',
    badgeBg: 'bg-emerald-100/90 text-emerald-800 ring-emerald-300/60',
    badgeText: 'Shopping',
    gradientHeader: 'from-emerald-500/12 via-emerald-500/4 to-transparent',
  },
  food: {
    primaryIcon: UtensilsCrossed,
    secondaryIcon: Coffee,
    accentName: 'Dining & Cafes',
    bgTint: 'bg-orange-50/50 hover:bg-orange-50/80',
    borderRing: 'ring-orange-400/30 hover:ring-orange-500/50',
    iconBg: 'bg-orange-100 ring-orange-200',
    iconColor: 'text-orange-800',
    badgeBg: 'bg-orange-100/90 text-orange-900 ring-orange-300/60',
    badgeText: 'Food & Drinks',
    gradientHeader: 'from-orange-500/12 via-orange-500/4 to-transparent',
  },
}

export function OfflineSurvivalKit() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )
  const [downloadedPackIds, setDownloadedPackIds] = useState<PhraseCategory[]>([])
  const [storageSizeKb, setStorageSizeKb] = useState(0)
  const [activeCategory, setActiveCategory] = useState<PhraseCategory | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Loading & action states
  const [downloadingPack, setDownloadingPack] = useState<string | null>(null)
  const [packToDelete, setPackToDelete] = useState<PhraseCategory | null>(null)
  const [cachedAudioSet, setCachedAudioSet] = useState<Set<string>>(new Set())

  // Interactive views
  const [activeShowPhrase, setActiveShowPhrase] = useState<OfflinePhrase | null>(null)
  const [playingPhraseId, setPlayingPhraseId] = useState<string | null>(null)
  const [copiedPhraseId, setCopiedPhraseId] = useState<string | null>(null)
  const [recentlyDownloadedPack, setRecentlyDownloadedPack] = useState<string | null>(null)

  const phrasesSectionRef = useRef<HTMLDivElement>(null)

  // Listen to network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      stopSpeaking()
    }
  }, [])

  // Load downloaded packs and storage state
  useEffect(() => {
    let isCancelled = false

    const fetchPacks = () => {
      getDownloadedPackIds()
        .then((ids) => {
          if (!isCancelled) setDownloadedPackIds(ids)
          return getTotalStorageSizeKb()
        })
        .then((size) => {
          if (!isCancelled) setStorageSizeKb(size)
        })
        .catch((err: unknown) => {
          console.error('Failed to load offline packs state:', err)
        })
    }

    fetchPacks()
    const unsubscribe = subscribeToPackUpdates(fetchPacks)

    return () => {
      isCancelled = true
      unsubscribe()
    }
  }, [])

  // Check cached audio for phrases when offline
  useEffect(() => {
    if (isOnline) return

    let isCancelled = false
    const checkAudio = async () => {
      const allDownloaded = OFFLINE_PHRASE_PACKS.flatMap((p) => p.phrases)
      const cached = new Set<string>()
      for (const phrase of allDownloaded) {
        if (await isAudioCached(phrase.kannada)) {
          cached.add(phrase.id)
        }
      }
      if (!isCancelled) {
        setCachedAudioSet(cached)
      }
    }

    void checkAudio()
    return () => {
      isCancelled = true
    }
  }, [isOnline, downloadedPackIds])

  // Download a single pack
  const handleDownload = async (packId: PhraseCategory) => {
    setDownloadingPack(packId)
    try {
      await downloadPack(packId)
      setRecentlyDownloadedPack(packId)
      setTimeout(() => setRecentlyDownloadedPack(null), 3000)
    } catch (err) {
      console.error('Failed to download pack:', err)
    } finally {
      setDownloadingPack(null)
    }
  }

  // Download all packs
  const handleDownloadAll = async () => {
    setDownloadingPack('all')
    try {
      await downloadAllPacks()
      setRecentlyDownloadedPack('all')
      setTimeout(() => setRecentlyDownloadedPack(null), 3000)
    } catch (err) {
      console.error('Failed to download all packs:', err)
    } finally {
      setDownloadingPack(null)
    }
  }

  // Confirm delete pack
  const handleConfirmDelete = async () => {
    if (!packToDelete) return
    try {
      await deletePack(packToDelete)
    } catch (err) {
      console.error('Failed to delete pack:', err)
    } finally {
      setPackToDelete(null)
    }
  }

  // Browse phrases in a category
  const handleBrowseCategory = (catId: PhraseCategory) => {
    setActiveCategory(catId)
    phrasesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Audio playback handler
  const handlePlayAudio = (phrase: OfflinePhrase) => {
    if (playingPhraseId === phrase.id) {
      stopSpeaking()
      setPlayingPhraseId(null)
      return
    }

    const started = speakKannada(
      phrase.kannada,
      phrase.transliteration,
      () => setPlayingPhraseId(phrase.id),
      () => setPlayingPhraseId(null),
      () => setPlayingPhraseId(null),
    )

    if (!started) {
      setPlayingPhraseId(null)
    }
  }

  // Copy handler
  const handleCopy = async (phrase: OfflinePhrase) => {
    const textToCopy = `${phrase.kannada}\n(${phrase.transliteration})\nEnglish: ${phrase.english}\nHindi: ${phrase.hindi}`

    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopiedPhraseId(phrase.id)
      setTimeout(() => setCopiedPhraseId(null), 2000)
    } catch {
      // ignore
    }
  }

  const downloadedSet = useMemo(() => new Set(downloadedPackIds), [downloadedPackIds])

  // Filter phrases (shows phrases from downloaded packs, or all preview phrases if none downloaded)
  const visiblePhrases = useMemo(() => {
    const packsToSource =
      downloadedSet.size > 0
        ? OFFLINE_PHRASE_PACKS.filter((p) => downloadedSet.has(p.id))
        : OFFLINE_PHRASE_PACKS

    const list = packsToSource.flatMap((p) => p.phrases)
    const q = searchQuery.toLowerCase().trim()

    return list.filter((item) => {
      if (activeCategory !== 'all' && item.category !== activeCategory) {
        return false
      }

      if (!q) return true

      return (
        item.kannada.toLowerCase().includes(q) ||
        item.transliteration.toLowerCase().includes(q) ||
        item.english.toLowerCase().includes(q) ||
        item.hindi.toLowerCase().includes(q)
      )
    })
  }, [downloadedSet, activeCategory, searchQuery])

  return (
    <section id="offline-kit" className="scroll-mt-24 py-12 sm:py-16">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        {/* Section Header */}
        <div className="text-center">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-forest-900/5 px-3.5 py-1.5 text-[13px] font-semibold tracking-[0.14em] text-forest-700 uppercase ring-1 ring-forest-900/10">
              <WifiOff className="h-4 w-4 text-amber-600" aria-hidden="true" />
              Smart Offline Survival Kit
            </span>

            {/* Live Online / Offline Status Badge */}
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-xs',
                isOnline
                  ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500/20'
                  : 'bg-amber-100 text-amber-900 ring-1 ring-amber-400',
              )}
            >
              {isOnline ? (
                <>
                  <Wifi className="h-3 w-3 text-emerald-600" />
                  <span>Online Mode (Full AI Available)</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 text-amber-700 animate-pulse" />
                  <span>Offline Mode (Using Local Kit)</span>
                </>
              )}
            </span>
          </div>

          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-forest-900 sm:text-4xl">
            Communicate Without Internet
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-500">
            Download verified phrase packs to ask for emergency help, hail autorickshaws, navigate
            buses, negotiate in markets, and order food when your connection drops.
          </p>
        </div>

        {/* Emergency Medical Disclaimer */}
        <div className="mt-8 rounded-2xl bg-rose-50/80 p-4 ring-1 ring-rose-200 text-xs text-rose-900 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="font-semibold text-rose-950">Emergency & Safety Notice: </strong>
            Offline phrase packs assist everyday communication during internet outages. In urgent
            medical or police crises, dial emergency services directly:{' '}
            <strong className="font-bold text-rose-950">112 (National Emergency)</strong> or{' '}
            <strong className="font-bold text-rose-950">108 (Ambulance in Karnataka)</strong>.
          </div>
        </div>

        {/* Visually Distinct Category Cards Grid */}
        <div className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-2.5">
              <h3 className="font-display text-lg font-semibold text-forest-900">
                Explore Survival Categories
              </h3>
              <span className="rounded-full bg-forest-900/5 px-2.5 py-0.5 text-xs font-semibold text-forest-800">
                {downloadedPackIds.length}/4 Downloaded
              </span>
              {storageSizeKb > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-ink-500 max-sm:hidden">
                  <HardDrive className="h-3.5 w-3.5 text-forest-600" />
                  {storageSizeKb} KB saved in browser
                </span>
              )}
            </div>

            {downloadedPackIds.length < 4 && (
              <Button
                variant="secondary"
                size="md"
                disabled={downloadingPack !== null}
                onClick={handleDownloadAll}
                className="text-xs h-9"
              >
                <Download className="h-3.5 w-3.5 text-forest-700" />
                <span>
                  {downloadingPack === 'all' ? 'Saving All Packs...' : 'Download All Packs (~56 KB)'}
                </span>
              </Button>
            )}
          </div>

          {/* 4 Category Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {OFFLINE_PHRASE_PACKS.map((pack) => {
              const isDownloaded = downloadedSet.has(pack.id)
              const isDownloading = downloadingPack === pack.id || downloadingPack === 'all'
              const config = CATEGORY_CONFIG[pack.id]
              const PrimaryIcon = config.primaryIcon
              const SecondaryIcon = config.secondaryIcon
              const isRecentlySaved = recentlyDownloadedPack === pack.id || recentlyDownloadedPack === 'all'

              return (
                <div
                  key={pack.id}
                  className={cn(
                    'relative overflow-hidden flex flex-col justify-between rounded-3xl p-5 transition-all duration-300 ring-1 shadow-soft',
                    config.bgTint,
                    config.borderRing,
                    isDownloaded && 'bg-white ring-2',
                  )}
                >
                  {/* Subtle category-specific gradient header accent */}
                  <div
                    className={cn(
                      'pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b',
                      config.gradientHeader,
                    )}
                  />

                  <div className="relative z-10">
                    {/* Top: Icon cluster and Status Pill */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <div
                          className={cn(
                            'flex h-11 w-11 items-center justify-center rounded-2xl ring-1 shadow-xs',
                            config.iconBg,
                            config.iconColor,
                          )}
                        >
                          <PrimaryIcon className="h-5 w-5" strokeWidth={2.2} />
                        </div>
                        <div
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-xl bg-white/80 ring-1 ring-forest-900/10 shadow-xs',
                            config.iconColor,
                          )}
                          title={config.accentName}
                        >
                          <SecondaryIcon className="h-4 w-4" strokeWidth={2} />
                        </div>
                      </div>

                      {/* Download status badge */}
                      {isDownloaded ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100/90 px-2.5 py-1 text-[11px] font-bold text-emerald-900 ring-1 ring-emerald-400/40 shadow-xs">
                          <CheckCircle2 className="h-3 w-3 text-emerald-700" />
                          <span>Saved (~{pack.approxSizeKb} KB)</span>
                        </span>
                      ) : (
                        <span className="rounded-full bg-canvas-200/80 px-2.5 py-1 text-[10px] font-semibold text-ink-500 ring-1 ring-forest-900/8">
                          Ready to Save (~{pack.approxSizeKb} KB)
                        </span>
                      )}
                    </div>

                    {/* Titles */}
                    <div className="mt-4">
                      <span
                        className={cn(
                          'inline-block rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ring-1 mb-1',
                          config.badgeBg,
                        )}
                      >
                        {config.badgeText}
                      </span>
                      <h4 className="font-display font-semibold text-forest-950 text-base leading-snug">
                        {pack.title}
                      </h4>
                      <p className="font-kannada text-xs font-semibold text-emerald-800 mt-0.5">
                        {pack.kannadaTitle}
                      </p>
                      <p className="mt-1.5 text-xs text-ink-500 leading-relaxed line-clamp-2">
                        {pack.description}
                      </p>
                    </div>
                  </div>

                  {/* Bottom: Action bar */}
                  <div className="relative z-10 mt-5 pt-3 border-t border-forest-900/8 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-ink-400">
                      {pack.phrases.length} phrases
                    </span>

                    <div className="flex items-center gap-1.5">
                      {isDownloaded ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleBrowseCategory(pack.id)}
                            className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-forest-800 px-3 py-1.5 text-xs font-semibold text-white shadow-soft hover:bg-forest-700 transition-colors"
                          >
                            <span>Open</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPackToDelete(pack.id)}
                            className="rounded-full p-1.5 text-ink-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Remove downloaded pack"
                            aria-label={`Remove ${pack.title} pack`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          disabled={isDownloading}
                          onClick={() => handleDownload(pack.id)}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-forest-800 px-3.5 py-1.5 text-xs font-semibold text-white shadow-soft hover:bg-forest-700 transition-all disabled:opacity-50"
                        >
                          <Download className="h-3 w-3" />
                          <span>{isDownloading ? 'Saving...' : 'Save Pack'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Instant visual feedback banner when saved */}
                  {isRecentlySaved && (
                    <div className="absolute inset-0 bg-emerald-600/95 flex flex-col items-center justify-center text-white z-20 rounded-3xl animate-fade-up">
                      <CheckCircle2 className="h-8 w-8 text-white mb-1" />
                      <p className="font-bold text-sm">Saved for Offline Use!</p>
                      <p className="text-xs text-emerald-100">Ready without internet</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Offline Phrase Browser & Search Area */}
        <div
          ref={phrasesSectionRef}
          className="mt-12 overflow-hidden rounded-3xl bg-white/90 shadow-lifted ring-1 ring-forest-900/10 p-6 sm:p-8 backdrop-blur-sm"
        >
          {/* Controls: Search, Category Filter Chips */}
          <div className="space-y-4 border-b border-forest-900/8 pb-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search offline phrases in English, Hindi, or Kannada..."
                  className="w-full rounded-2xl border-0 bg-canvas-100/70 pl-10 pr-4 py-2.5 text-sm text-ink-900 ring-1 ring-forest-900/10 placeholder:text-ink-400 focus:bg-white focus:ring-2 focus:ring-forest-600 outline-none transition-all"
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

              {/* Offline Availability Counter */}
              <div className="flex items-center gap-2 self-start sm:self-auto text-xs text-ink-500 font-medium px-2 py-1 bg-canvas-100 rounded-xl">
                <BookmarkCheck className="h-4 w-4 text-emerald-600" />
                <span>Showing {visiblePhrases.length} phrases</span>
              </div>
            </div>

            {/* Category Filter Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setActiveCategory('all')}
                className={cn(
                  'cursor-pointer rounded-full px-4 py-1.5 text-xs font-semibold transition-all',
                  activeCategory === 'all'
                    ? 'bg-forest-800 text-white shadow-soft'
                    : 'bg-canvas-100 text-ink-700 ring-1 ring-forest-900/10 hover:bg-canvas-200',
                )}
              >
                All Categories ({visiblePhrases.length})
              </button>

              {OFFLINE_PHRASE_PACKS.map((pack) => {
                const config = CATEGORY_CONFIG[pack.id]
                const Icon = config.primaryIcon
                const isSelected = activeCategory === pack.id
                const isDownloaded = downloadedSet.has(pack.id)

                return (
                  <button
                    key={pack.id}
                    type="button"
                    onClick={() => setActiveCategory(pack.id)}
                    className={cn(
                      'cursor-pointer inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ring-1',
                      isSelected
                        ? 'bg-forest-800 text-white ring-forest-900 shadow-soft'
                        : isDownloaded
                          ? `${config.bgTint} ${config.iconColor} ${config.borderRing}`
                          : 'bg-canvas-50 text-ink-400 ring-forest-900/6 opacity-70 hover:opacity-100',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{pack.title}</span>
                    {isDownloaded && <span className="text-[10px] opacity-75">✓</span>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Phrase Cards List */}
          <div className="mt-6 space-y-4">
            {downloadedPackIds.length === 0 ? (
              /* Empty state: No packs downloaded yet */
              <div className="rounded-3xl bg-canvas-50/70 p-10 text-center ring-1 ring-forest-900/8">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 ring-1 ring-amber-300">
                  <Download className="h-7 w-7" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-forest-900">
                  No phrase packs downloaded yet
                </h3>
                <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-ink-500">
                  Download phrase packs using the cards above so these essential phrases are ready
                  whenever you lose mobile signal or travel in Karnataka.
                </p>
                <div className="mt-5">
                  <Button variant="primary" size="md" onClick={handleDownloadAll}>
                    <Sparkles className="h-4 w-4" />
                    Download All Packs (~56 KB)
                  </Button>
                </div>
              </div>
            ) : visiblePhrases.length === 0 ? (
              /* Empty state: Search query returned 0 */
              <div className="rounded-3xl bg-canvas-50/70 p-8 text-center ring-1 ring-forest-900/8">
                <p className="text-sm font-semibold text-forest-900">
                  No phrases match "{searchQuery}"
                </p>
                <p className="mt-1 text-xs text-ink-400">
                  Try another search term or switch to another category.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    setActiveCategory('all')
                  }}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-forest-50 px-3.5 py-1.5 text-xs font-semibold text-forest-700 ring-1 ring-forest-900/10 hover:bg-forest-100 transition-colors"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reset Search</span>
                </button>
              </div>
            ) : (
              /* Improved Phrase Cards with Clearly Separated Meanings & Audio Indicator */
              visiblePhrases.map((phrase) => {
                const config = CATEGORY_CONFIG[phrase.category]
                const Icon = config.primaryIcon
                const isPlaying = playingPhraseId === phrase.id
                const isCopied = copiedPhraseId === phrase.id

                // Working audio availability: available online OR when cached offline
                const isAudioAvailable = isOnline || cachedAudioSet.has(phrase.id)

                return (
                  <article
                    key={phrase.id}
                    className={cn(
                      'rounded-3xl bg-white p-5 sm:p-6 ring-1 transition-all duration-200 shadow-soft hover:shadow-lifted',
                      config.borderRing,
                    )}
                  >
                    {/* Top Row: Category tag, Saved offline pill, Emergency alert */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-forest-900/6 pb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide uppercase ring-1',
                            config.badgeBg,
                          )}
                        >
                          <Icon className="h-3 w-3" />
                          <span>{config.badgeText}</span>
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 ring-1 ring-emerald-500/20">
                          <Check className="h-2.5 w-2.5" />
                          <span>Saved in Offline Kit</span>
                        </span>
                      </div>

                      {phrase.safetyNote && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-800 ring-1 ring-rose-300">
                          <ShieldAlert className="h-3 w-3 text-rose-600" />
                          <span>{phrase.safetyNote}</span>
                        </span>
                      )}
                    </div>

                    {/* Middle: Prominent Kannada Script & Phonetic Transliteration */}
                    <div className="mt-4 space-y-2">
                      <p className="font-kannada text-2xl sm:text-3xl font-bold text-forest-950 leading-relaxed tracking-wide">
                        {phrase.kannada}
                      </p>

                      <div className="inline-flex items-center gap-1.5 rounded-xl bg-forest-50/80 px-3 py-1.5 text-xs ring-1 ring-forest-900/8">
                        <span className="font-semibold text-forest-700">Pronounce:</span>
                        <span className="font-medium text-ink-800 italic">
                          "{phrase.transliteration}"
                        </span>
                      </div>
                    </div>

                    {/* Separated English and Hindi Meanings */}
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {/* English Meaning Card */}
                      <div className="rounded-2xl bg-canvas-100/80 p-3.5 ring-1 ring-forest-900/6">
                        <span className="text-[10px] font-bold tracking-wider text-forest-700 uppercase">
                          English Meaning
                        </span>
                        <p className="mt-0.5 text-sm font-semibold text-ink-900 leading-snug">
                          {phrase.english}
                        </p>
                      </div>

                      {/* Hindi Meaning Card */}
                      <div className="rounded-2xl bg-canvas-100/80 p-3.5 ring-1 ring-forest-900/6">
                        <span className="text-[10px] font-bold tracking-wider text-forest-700 uppercase">
                          हिंदी (Hindi) Meaning
                        </span>
                        <p className="mt-0.5 text-sm font-semibold text-ink-900 leading-snug">
                          {phrase.hindi}
                        </p>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-forest-900/6 pt-3">
                      <div className="flex items-center gap-2">
                        {/* High-visibility Show to Someone button */}
                        <button
                          type="button"
                          onClick={() => setActiveShowPhrase(phrase)}
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-forest-800 px-4 py-2 text-xs font-semibold text-white shadow-soft hover:bg-forest-700 hover:shadow-lifted transition-all active:scale-95"
                          title="Open big readable view to show someone nearby"
                        >
                          <Maximize2 className="h-3.5 w-3.5" />
                          <span>Show to Someone</span>
                        </button>

                        {/* Working Audio button: ONLY when audio functionality is available */}
                        {isAudioAvailable ? (
                          <IconButton
                            label={isPlaying ? 'Stop audio' : 'Listen to Kannada audio'}
                            icon={isPlaying ? VolumeX : Volume2}
                            onClick={() => handlePlayAudio(phrase)}
                            className={cn(
                              isPlaying &&
                                'bg-emerald-100 text-emerald-800 ring-2 ring-emerald-500 animate-pulse',
                            )}
                          />
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 rounded-full bg-canvas-200/60 px-2.5 py-1 text-[11px] font-medium text-ink-400"
                            title="Offline audio is not cached for this phrase. Use the pronunciation guide above or 'Show to Someone'."
                          >
                            <VolumeX className="h-3 w-3" />
                            <span>Audio online-only</span>
                          </span>
                        )}

                        {/* Copy button */}
                        <IconButton
                          label={isCopied ? 'Copied' : 'Copy phrase and meanings'}
                          icon={isCopied ? Check : Copy}
                          onClick={() => void handleCopy(phrase)}
                          className={cn(isCopied && 'bg-emerald-100 text-emerald-800')}
                        />
                      </div>

                      <span className="text-[11px] font-medium text-ink-400">
                        NammaConnect Offline Phrase
                      </span>
                    </div>
                  </article>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* "Show to Someone" Modal */}
      <ShowToSomeoneModal
        phrase={activeShowPhrase}
        isOpen={activeShowPhrase !== null}
        onClose={() => setActiveShowPhrase(null)}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={packToDelete !== null}
        title="Remove Downloaded Pack?"
        message={`Are you sure you want to remove the ${
          packToDelete ? getPackById(packToDelete)?.title : ''
        } pack from offline storage? You will need an active internet connection to download it again.`}
        confirmText="Yes, Remove Pack"
        cancelText="Keep Pack"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setPackToDelete(null)}
      />
    </section>
  )
}
