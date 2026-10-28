/**
 * Persistent Browser Storage Service for Conversation History and Corrections.
 *
 * Requirements satisfied:
 * - Native IndexedDB for structured, persistent browser-local storage.
 * - Automatic, graceful fallback to localStorage when IndexedDB is unavailable
 *   (e.g., sandboxed iframes, private browsing restrictions, or quota limits).
 * - Immutability: original transcripts and initial translations are strictly preserved
 *   when a correction is applied.
 * - Local-only: conversation data is never sent to external servers or analytics.
 * - Zero raw audio storage to protect user privacy and disk space.
 */

export type ErrorCategory =
  | 'mistranslation'
  | 'grammar'
  | 'spelling'
  | 'tone'
  | 'incomplete'
  | 'other'

export interface TranslationText {
  kannada: string
  transliteration?: string
}

export interface CorrectedTranslationText extends TranslationText {
  note?: string
}

export interface ConversationEntry {
  id: string
  timestamp: number
  updatedAt?: number
  sourceText: string
  sourceLanguage: string
  targetLanguage: string
  initialTranslation: TranslationText
  correctedTranslation?: CorrectedTranslationText
  correctionStatus: 'original' | 'corrected'
  errorCategory?: ErrorCategory
}

export interface CorrectionPayload {
  kannada: string
  transliteration?: string
  note?: string
  errorCategory?: ErrorCategory
}

const DB_NAME = 'nammaconnect_db'
const DB_VERSION = 1
const STORE_NAME = 'conversations'
const LOCAL_STORAGE_KEY = 'nammaconnect_history_v1'

// Event bus for reactive UI updates across components
type HistoryListener = () => void
const listeners = new Set<HistoryListener>()

export function subscribeToHistory(listener: HistoryListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function notifySubscribers(): void {
  for (const listener of listeners) {
    try {
      listener()
    } catch (e) {
      console.error('Error notifying history subscriber:', e)
    }
  }
}

/**
 * Open or upgrade the IndexedDB database.
 */
function openDatabase(): Promise<IDBDatabase> {
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
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
          store.createIndex('timestamp', 'timestamp', { unique: false })
          store.createIndex('correctionStatus', 'correctionStatus', { unique: false })
        }
      }

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'))
    } catch (err) {
      reject(err)
    }
  })
}

/* ==================== LocalStorage Fallback ==================== */

function getLocalStorageEntries(): ConversationEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (Array.isArray(parsed)) {
      return parsed as ConversationEntry[]
    }
    return []
  } catch (err) {
    console.warn('Could not read conversation history from localStorage:', err)
    return []
  }
}

function saveLocalStorageEntries(entries: ConversationEntry[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(entries))
  } catch (err) {
    console.error('Could not save conversation history to localStorage:', err)
  }
}

/* ==================== Public Storage API ==================== */

/**
 * Retrieves all conversation entries, sorted with newest first.
 */
export async function getConversationEntries(): Promise<ConversationEntry[]> {
  try {
    const db = await openDatabase()
    return await new Promise<ConversationEntry[]>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.getAll()

      request.onsuccess = () => {
        const entries = (request.result as ConversationEntry[]) || []
        // Sort descending by timestamp (newest first)
        entries.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        resolve(entries)
      }
      request.onerror = () => reject(request.error)
    })
  } catch {
    // Graceful fallback to localStorage
    const entries = getLocalStorageEntries()
    entries.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    return entries
  }
}

/**
 * Adds a new conversation entry to storage.
 */
export async function addConversationEntry(entry: ConversationEntry): Promise<void> {
  let saved = false

  try {
    const db = await openDatabase()
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.add(entry)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
    saved = true
  } catch {
    // If IndexedDB fails, store in localStorage
    const entries = getLocalStorageEntries()
    entries.unshift(entry)
    saveLocalStorageEntries(entries)
    saved = true
  }

  if (saved) {
    notifySubscribers()
  }
}

/**
 * Applies a user correction to an existing conversation entry.
 *
 * Strictly adheres to requirement 3:
 * 1. Preserves original transcript (sourceText).
 * 2. Preserves initial translation (initialTranslation).
 * 3. Saves corrected translation separately.
 * 4. Updates correction status and timestamp.
 */
export async function updateConversationCorrection(
  id: string,
  payload: CorrectionPayload,
): Promise<ConversationEntry | null> {
  const cleanKannada = payload.kannada.trim()
  if (!cleanKannada) {
    throw new Error('Corrected translation cannot be empty.')
  }

  let updatedRecord: ConversationEntry | null = null

  try {
    const db = await openDatabase()
    updatedRecord = await new Promise<ConversationEntry | null>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const getRequest = store.get(id)

      getRequest.onsuccess = () => {
        const existing = getRequest.result as ConversationEntry | undefined
        if (!existing) {
          resolve(null)
          return
        }

        // Preserve original transcript and initial translation strictly
        const updated: ConversationEntry = {
          ...existing,
          correctedTranslation: {
            kannada: cleanKannada,
            transliteration: payload.transliteration?.trim() || undefined,
            note: payload.note?.trim() || undefined,
          },
          correctionStatus: 'corrected',
          errorCategory: payload.errorCategory,
          updatedAt: Date.now(),
        }

        const putRequest = store.put(updated)
        putRequest.onsuccess = () => resolve(updated)
        putRequest.onerror = () => reject(putRequest.error)
      }

      getRequest.onerror = () => reject(getRequest.error)
    })
  } catch {
    // LocalStorage fallback
    const entries = getLocalStorageEntries()
    const index = entries.findIndex((e) => e.id === id)
    if (index !== -1) {
      const existing = entries[index]
      const updated: ConversationEntry = {
        ...existing,
        correctedTranslation: {
          kannada: cleanKannada,
          transliteration: payload.transliteration?.trim() || undefined,
          note: payload.note?.trim() || undefined,
        },
        correctionStatus: 'corrected',
        errorCategory: payload.errorCategory,
        updatedAt: Date.now(),
      }
      entries[index] = updated
      saveLocalStorageEntries(entries)
      updatedRecord = updated
    }
  }

  if (updatedRecord) {
    notifySubscribers()
  }

  return updatedRecord
}

/**
 * Deletes a single conversation entry by ID.
 */
export async function deleteConversationEntry(id: string): Promise<void> {
  try {
    const db = await openDatabase()
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch {
    const entries = getLocalStorageEntries().filter((e) => e.id !== id)
    saveLocalStorageEntries(entries)
  }

  notifySubscribers()
}

/**
 * Clears all conversation history from storage.
 */
export async function clearAllConversationEntries(): Promise<void> {
  try {
    const db = await openDatabase()
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.clear()

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch {
    saveLocalStorageEntries([])
  }

  // Also clear localStorage key in case of mixed usage
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY)
  } catch {
    // ignore
  }

  notifySubscribers()
}
