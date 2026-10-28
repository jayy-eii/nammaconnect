/**
 * Persistent Offline Storage Service for NammaConnect Survival Kit.
 *
 * Requirements:
 * - Structured persistent storage in browser IndexedDB.
 * - Automatic fallback to localStorage when IndexedDB is blocked.
 * - Manages downloaded phrase packs, download timestamps, and sizes.
 * - Provides reactive subscription bus for live component updates.
 * - Handles offline audio caching via Cache Storage API when available.
 */

import {
  type PhraseCategory,
  type OfflinePhrase,
  OFFLINE_PHRASE_PACKS,
  getPackById,
} from '../data/offlinePhrases.ts'

export interface DownloadedPackRecord {
  id: PhraseCategory
  downloadedAt: number
  phraseCount: number
  approxSizeKb: number
  cachedAudioCount?: number
}

const DB_NAME = 'nammaconnect_offline_db'
const DB_VERSION = 1
const STORE_NAME = 'downloaded_packs'
const LOCAL_STORAGE_KEY = 'nammaconnect_offline_packs_v1'
const AUDIO_CACHE_NAME = 'nammaconnect-audio-cache-v1'

type UpdateListener = () => void
const subscribers = new Set<UpdateListener>()

export function subscribeToPackUpdates(listener: UpdateListener): () => void {
  subscribers.add(listener)
  return () => {
    subscribers.delete(listener)
  }
}

function notifySubscribers(): void {
  for (const listener of subscribers) {
    try {
      listener()
    } catch (e) {
      console.error('Error notifying offline pack subscriber:', e)
    }
  }
}

/**
 * Open IndexedDB for offline packs.
 */
function openOfflineDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'))
      return
    }

    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        }
      }

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error || new Error('Failed to open offline IndexedDB'))
    } catch (err) {
      reject(err)
    }
  })
}

/* ==================== LocalStorage Fallback ==================== */

function getLocalStoragePacks(): Record<string, DownloadedPackRecord> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as Record<string, DownloadedPackRecord>
    }
    return {}
  } catch {
    return {}
  }
}

function saveLocalStoragePacks(packs: Record<string, DownloadedPackRecord>): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(packs))
  } catch (err) {
    console.error('Could not save offline packs to localStorage:', err)
  }
}

/* ==================== Public API ==================== */

/**
 * Returns all downloaded pack records.
 */
export async function getDownloadedPacks(): Promise<DownloadedPackRecord[]> {
  try {
    const db = await openOfflineDatabase()
    return await new Promise<DownloadedPackRecord[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.getAll()

      req.onsuccess = () => {
        resolve((req.result as DownloadedPackRecord[]) || [])
      }
      req.onerror = () => reject(req.error)
    })
  } catch {
    const packs = getLocalStoragePacks()
    return Object.values(packs)
  }
}

/**
 * Checks if a specific pack category is downloaded.
 */
export async function isPackDownloaded(packId: PhraseCategory): Promise<boolean> {
  const packs = await getDownloadedPacks()
  return packs.some((p) => p.id === packId)
}

/**
 * Returns the IDs of all downloaded packs.
 */
export async function getDownloadedPackIds(): Promise<PhraseCategory[]> {
  const packs = await getDownloadedPacks()
  return packs.map((p) => p.id)
}

/**
 * Downloads and saves a phrase pack locally.
 */
export async function downloadPack(packId: PhraseCategory): Promise<void> {
  const pack = getPackById(packId)
  if (!pack) {
    throw new Error(`Pack with ID ${packId} does not exist.`)
  }

  const record: DownloadedPackRecord = {
    id: packId,
    downloadedAt: Date.now(),
    phraseCount: pack.phrases.length,
    approxSizeKb: pack.approxSizeKb,
  }

  let saved = false

  try {
    const db = await openOfflineDatabase()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.put(record)

      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
    saved = true
  } catch {
    const packs = getLocalStoragePacks()
    packs[packId] = record
    saveLocalStoragePacks(packs)
    saved = true
  }

  // Pre-cache audio if network and Cache API are available
  if (typeof window !== 'undefined' && 'caches' in window && navigator.onLine) {
    void cachePackAudio(pack)
  }

  if (saved) {
    notifySubscribers()
  }
}

/**
 * Downloads all 4 phrase packs.
 */
export async function downloadAllPacks(): Promise<void> {
  for (const pack of OFFLINE_PHRASE_PACKS) {
    await downloadPack(pack.id)
  }
}

/**
 * Removes a downloaded pack from offline storage.
 */
export async function deletePack(packId: PhraseCategory): Promise<void> {
  try {
    const db = await openOfflineDatabase()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.delete(packId)

      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  } catch {
    const packs = getLocalStoragePacks()
    delete packs[packId]
    saveLocalStoragePacks(packs)
  }

  notifySubscribers()
}

/**
 * Clears all downloaded phrase packs.
 */
export async function clearAllPacks(): Promise<void> {
  try {
    const db = await openOfflineDatabase()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.clear()

      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  } catch {
    saveLocalStoragePacks({})
  }

  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY)
  } catch {
    // ignore
  }

  notifySubscribers()
}

/**
 * Returns all phrases available from currently downloaded packs.
 */
export async function getDownloadedPhrases(): Promise<OfflinePhrase[]> {
  const downloadedIds = await getDownloadedPackIds()
  const downloadedSet = new Set(downloadedIds)

  return OFFLINE_PHRASE_PACKS.filter((pack) => downloadedSet.has(pack.id)).flatMap(
    (pack) => pack.phrases,
  )
}

/**
 * Returns total storage size of downloaded packs in KB.
 */
export async function getTotalStorageSizeKb(): Promise<number> {
  const packs = await getDownloadedPacks()
  return packs.reduce((acc, p) => acc + (p.approxSizeKb || 0), 0)
}

/**
 * Checks whether audio for a specific Kannada phrase is cached in browser storage.
 */
export async function isAudioCached(kannadaText: string): Promise<boolean> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return false
  }

  try {
    const cleanText = kannadaText.replace(/[?.,!¿¡;:()]/g, ' ').trim()
    const url = `/api/tts?q=${encodeURIComponent(cleanText)}&lang=kn`
    const cache = await caches.open(AUDIO_CACHE_NAME)
    const match = await cache.match(url)
    return Boolean(match)
  } catch {
    return false
  }
}

/**
 * Attempts to pre-cache audio files for a pack when online.
 */
async function cachePackAudio(pack: (typeof OFFLINE_PHRASE_PACKS)[number]): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window) || !navigator.onLine) {
    return
  }

  try {
    const cache = await caches.open(AUDIO_CACHE_NAME)
    for (const phrase of pack.phrases) {
      const cleanText = phrase.kannada.replace(/[?.,!¿¡;:()]/g, ' ').trim()
      const url = `/api/tts?q=${encodeURIComponent(cleanText)}&lang=kn`
      try {
        const response = await fetch(url)
        if (response.ok) {
          await cache.put(url, response)
        }
      } catch {
        // Continue silently if audio fetch fails
      }
    }
  } catch {
    // Non-blocking
  }
}
