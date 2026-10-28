import assert from 'node:assert/strict'

// Create browser mock environment for Node
class MockStorage {
  private store: Map<string, string> = new Map()

  getItem(key: string): string | null {
    return this.store.get(key) ?? null
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value)
  }
  removeItem(key: string): void {
    this.store.delete(key)
  }
  clear(): void {
    this.store.clear()
  }
}

// Attach mocks to global before importing storage
const mockLocalStorage = new MockStorage()
;(globalThis as any).localStorage = mockLocalStorage
;(globalThis as any).window = {
  localStorage: mockLocalStorage,
  indexedDB: undefined, // Test localStorage fallback mode first
}

// Dynamic import to pick up global mocks
const {
  addConversationEntry,
  getConversationEntries,
  updateConversationCorrection,
  deleteConversationEntry,
  clearAllConversationEntries,
  subscribeToHistory,
} = await import('../src/services/conversationStorage.ts')

console.log('🧪 Starting Conversation Replay & Correction Trail Verification Suite...\n')

// Test 1: Empty state
console.log('Test 1: Empty state returns empty array')
await clearAllConversationEntries()
let entries = await getConversationEntries()
assert.equal(entries.length, 0, 'Initial entries must be empty')
console.log('✓ Passed\n')

// Test 2: Add conversation entry
console.log('Test 2: Adding a conversation entry preserves original data')
let subscriberFired = 0
const unsub = subscribeToHistory(() => {
  subscriberFired++
})

const testEntry1 = {
  id: 'test-1',
  timestamp: 1000,
  sourceText: 'Where is the metro station?',
  sourceLanguage: 'English',
  targetLanguage: 'Kannada',
  initialTranslation: {
    kannada: 'ಮೆಟ್ರೋ ನಿಲ್ದಾಣ ಎಲ್ಲಿದೆ?',
    transliteration: 'Metro nildana ellide?',
  },
  correctionStatus: 'original' as const,
}

await addConversationEntry(testEntry1)
assert.equal(subscriberFired, 1, 'Subscriber must be notified on add')

entries = await getConversationEntries()
assert.equal(entries.length, 1)
assert.equal(entries[0].sourceText, 'Where is the metro station?')
assert.equal(entries[0].initialTranslation.kannada, 'ಮೆಟ್ರೋ ನಿಲ್ದಾಣ ಎಲ್ಲಿದೆ?')
assert.equal(entries[0].correctionStatus, 'original')
assert.equal(entries[0].correctedTranslation, undefined)
console.log('✓ Passed\n')

// Test 3: Multiple entries sorting (newest first)
console.log('Test 3: Multiple entries sorted newest first')
const testEntry2 = {
  id: 'test-2',
  timestamp: 2000,
  sourceText: 'How much does this cost?',
  sourceLanguage: 'English',
  targetLanguage: 'Kannada',
  initialTranslation: {
    kannada: 'ಇದರ ಬೆಲೆ ಎಷ್ಟು?',
    transliteration: 'Idara bele eshtu?',
  },
  correctionStatus: 'original' as const,
}

await addConversationEntry(testEntry2)
entries = await getConversationEntries()
assert.equal(entries.length, 2)
assert.equal(entries[0].id, 'test-2', 'Newer entry (timestamp 2000) should appear first')
assert.equal(entries[1].id, 'test-1', 'Older entry (timestamp 1000) should appear second')
console.log('✓ Passed\n')

// Test 4: Correction Trail immutability guarantee
console.log('Test 4: Correction Trail preserves original transcript and initial translation')
const correctedResult = await updateConversationCorrection('test-1', {
  kannada: 'ಮೆಟ್ರೋ ಸ್ಟೇಷನ್ ಎಲ್ಲಿದೆ ರೀ?',
  transliteration: 'Metro station ellide ree?',
  note: 'More natural spoken Bengaluru Kannada',
  errorCategory: 'tone',
})

assert.ok(correctedResult, 'Update must return the updated entry')
assert.equal(correctedResult.id, 'test-1')
// Critical: verify original text and initial translation are unchanged
assert.equal(correctedResult.sourceText, 'Where is the metro station?', 'Original transcript must NOT be mutated')
assert.equal(correctedResult.initialTranslation.kannada, 'ಮೆಟ್ರೋ ನಿಲ್ದಾಣ ಎಲ್ಲಿದೆ?', 'Initial translation must NOT be mutated')
assert.equal(correctedResult.initialTranslation.transliteration, 'Metro nildana ellide?', 'Initial transliteration must NOT be mutated')

// Critical: verify correction fields are set
assert.equal(correctedResult.correctionStatus, 'corrected')
assert.equal(correctedResult.errorCategory, 'tone')
assert.equal(correctedResult.correctedTranslation?.kannada, 'ಮೆಟ್ರೋ ಸ್ಟೇಷನ್ ಎಲ್ಲಿದೆ ರೀ?')
assert.equal(correctedResult.correctedTranslation?.transliteration, 'Metro station ellide ree?')
assert.equal(correctedResult.correctedTranslation?.note, 'More natural spoken Bengaluru Kannada')
assert.ok(typeof correctedResult.updatedAt === 'number' && correctedResult.updatedAt > 0, 'updatedAt timestamp must be recorded')

// Verify persistence of correction
const persisted = await getConversationEntries()
const found = persisted.find((e) => e.id === 'test-1')
assert.ok(found)
assert.equal(found.initialTranslation.kannada, 'ಮೆಟ್ರೋ ನಿಲ್ದಾಣ ಎಲ್ಲಿದೆ?')
assert.equal(found.correctedTranslation?.kannada, 'ಮೆಟ್ರೋ ಸ್ಟೇಷನ್ ಎಲ್ಲಿದೆ ರೀ?')
assert.equal(found.correctionStatus, 'corrected')
console.log('✓ Passed\n')

// Test 5: Validation - Empty corrected translation rejected
console.log('Test 5: Empty corrected translation is rejected with error')
await assert.rejects(
  async () => {
    await updateConversationCorrection('test-1', { kannada: '   ' })
  },
  { message: 'Corrected translation cannot be empty.' }
)
console.log('✓ Passed\n')

// Test 6: Delete single entry
console.log('Test 6: Deleting an individual entry')
await deleteConversationEntry('test-2')
entries = await getConversationEntries()
assert.equal(entries.length, 1)
assert.equal(entries[0].id, 'test-1')
console.log('✓ Passed\n')

// Test 7: Clear all conversation history
console.log('Test 7: Clear all history')
await clearAllConversationEntries()
entries = await getConversationEntries()
assert.equal(entries.length, 0)
console.log('✓ Passed\n')

unsub()
console.log('🎉 All 7 Verification Suite Tests Passed Successfully!')
