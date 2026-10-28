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

const mockLocalStorage = new MockStorage()
;(globalThis as any).localStorage = mockLocalStorage
;(globalThis as any).window = {
  localStorage: mockLocalStorage,
  indexedDB: undefined, // Test fallback persistence mode
}

// Import offline kit data and storage services
const {
  OFFLINE_PHRASE_PACKS,
  getAllPhrases,
  getPackById,
} = await import('../src/data/offlinePhrases.ts')

const {
  downloadPack,
  downloadAllPacks,
  deletePack,
  clearAllPacks,
  isPackDownloaded,
  getDownloadedPackIds,
  getDownloadedPhrases,
  getTotalStorageSizeKb,
  subscribeToPackUpdates,
  isAudioCached,
} = await import('../src/services/offlineStorage.ts')

console.log('🧪 Starting Smart Offline Survival Kit Verification Suite...\n')

// Test 1: Phrase Dataset Integrity
console.log('Test 1: Verifying phrase dataset structure and 4 core packs')
assert.equal(OFFLINE_PHRASE_PACKS.length, 4, 'Must have exactly 4 core packs')

const expectedPacks = ['emergency', 'transport', 'shopping', 'food']
for (const packId of expectedPacks) {
  const pack = getPackById(packId as any)
  assert.ok(pack, `Pack ${packId} must exist`)
  assert.ok(pack.phrases.length >= 8, `Pack ${packId} must have at least 8 phrases`)
  assert.ok(pack.title.length > 0)
  assert.ok(pack.kannadaTitle.length > 0)
  assert.ok(pack.approxSizeKb > 0)

  // Verify each phrase
  for (const phrase of pack.phrases) {
    assert.equal(phrase.category, packId)
    assert.ok(phrase.kannada.trim().length > 0, 'Kannada script must not be empty')
    assert.ok(phrase.transliteration.trim().length > 0, 'Transliteration must not be empty')
    assert.ok(phrase.english.trim().length > 0, 'English meaning must not be empty')
    assert.ok(phrase.hindi.trim().length > 0, 'Hindi meaning must not be empty')
  }
}

const emergencyPack = getPackById('emergency')!
const ambulancePhrase = emergencyPack.phrases.find((p) => p.kannada.includes('ಆಂಬುಲೆನ್ಸ್'))
assert.ok(ambulancePhrase, 'Must have ambulance emergency phrase')
assert.ok(ambulancePhrase.safetyNote?.includes('108'), 'Ambulance phrase must specify dial 108 in Karnataka')

console.log(`✓ Passed (Total verified phrases: ${getAllPhrases().length})\n`)

// Test 2: Initial Offline Storage State
console.log('Test 2: Initial offline storage state is clean')
await clearAllPacks()
let downloadedIds = await getDownloadedPackIds()
assert.equal(downloadedIds.length, 0, 'Initial downloaded packs must be empty')
let downloadedPhrases = await getDownloadedPhrases()
assert.equal(downloadedPhrases.length, 0, 'Initial downloaded phrases must be 0')
console.log('✓ Passed\n')

// Test 3: Downloading a Single Pack
console.log('Test 3: Downloading individual pack (Emergency & Hospital)')
let updateEvents = 0
const unsub = subscribeToPackUpdates(() => {
  updateEvents++
})

await downloadPack('emergency')
assert.equal(updateEvents, 1, 'Subscriber must be notified on download')

assert.equal(await isPackDownloaded('emergency'), true)
assert.equal(await isPackDownloaded('transport'), false)

downloadedIds = await getDownloadedPackIds()
assert.deepEqual(downloadedIds, ['emergency'])

downloadedPhrases = await getDownloadedPhrases()
assert.equal(downloadedPhrases.length, emergencyPack.phrases.length)
assert.ok(downloadedPhrases.every((p) => p.category === 'emergency'))
console.log('✓ Passed\n')

// Test 4: Downloading All Packs
console.log('Test 4: Downloading all 4 packs and calculating storage size')
await downloadAllPacks()
downloadedIds = await getDownloadedPackIds()
assert.equal(downloadedIds.length, 4, 'All 4 packs must be downloaded')

const totalSize = await getTotalStorageSizeKb()
assert.ok(totalSize > 40 && totalSize < 80, `Total storage size should be ~56 KB, was ${totalSize} KB`)

downloadedPhrases = await getDownloadedPhrases()
assert.equal(downloadedPhrases.length, getAllPhrases().length)
console.log(`✓ Passed (All 4 packs saved locally, storage used: ${totalSize} KB)\n`)

// Test 5: Offline Search & Filtering Without Network
console.log('Test 5: Searching and filtering phrases offline')
// Simulate searching for "meter" in offline phrases
const query = 'meter'
const searchResults = downloadedPhrases.filter(
  (p) =>
    p.kannada.toLowerCase().includes(query) ||
    p.transliteration.toLowerCase().includes(query) ||
    p.english.toLowerCase().includes(query) ||
    p.hindi.toLowerCase().includes(query),
)

assert.ok(searchResults.length >= 1, 'Should find meter phrase in transport')
assert.ok(searchResults.some((p) => p.kannada.includes('ಮೀಟರ್')))

// Simulate category filter
const foodPhrases = downloadedPhrases.filter((p) => p.category === 'food')
assert.equal(foodPhrases.length, getPackById('food')!.phrases.length)
console.log('✓ Passed\n')

// Test 6: Deleting a Pack
console.log('Test 6: Deleting a single downloaded pack (Shopping)')
await deletePack('shopping')
assert.equal(await isPackDownloaded('shopping'), false)
assert.equal(await isPackDownloaded('emergency'), true)
downloadedIds = await getDownloadedPackIds()
assert.equal(downloadedIds.length, 3)
console.log('✓ Passed\n')

// Test 7: Clearing All Packs
console.log('Test 7: Clearing all offline packs')
await clearAllPacks()
downloadedIds = await getDownloadedPackIds()
assert.equal(downloadedIds.length, 0)
downloadedPhrases = await getDownloadedPhrases()
assert.equal(downloadedPhrases.length, 0)
console.log('✓ Passed\n')

// Test 8: Offline Audio Availability Contract
console.log('Test 8: Verifying honest audio availability state when offline')
const audioCached = await isAudioCached('ದಯವಿಟ್ಟು ನನಗೆ ಸಹಾಯ ಮಾಡಿ!')
assert.equal(audioCached, false, 'Audio should honestly report false when uncached in mock environment')
console.log('✓ Passed\n')

unsub()
console.log('🎉 All 8 Smart Offline Survival Kit Tests Passed Successfully!')
