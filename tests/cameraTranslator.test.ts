import assert from 'node:assert/strict'

// Mock global fetch for testing cameraTranslator client service
let mockFetchHandler: ((url: string, init?: RequestInit) => Promise<Response>) | null = null

;(globalThis as any).fetch = (url: string, init?: RequestInit) => {
  if (mockFetchHandler) {
    return mockFetchHandler(url, init)
  }
  return Promise.reject(new Error('fetch unmocked'))
}

// Import client services
const { scanAndTranslateImage, retranslateKannada } = await import(
  '../src/services/cameraTranslator.ts'
)
const { addConversationEntry, getConversationEntries, clearAllConversationEntries } =
  await import('../src/services/conversationStorage.ts')

console.log('🧪 Starting Camera Translator Verification Suite...\n')

// Test 1: Successful OCR and Translation with Bounding Boxes
console.log('Test 1: Successful OCR & Translation with Bounding Boxes')
mockFetchHandler = async (url, init) => {
  assert.equal(url, '/api/ocr-translate')
  assert.equal(init?.method, 'POST')
  const body = JSON.parse(init?.body as string)
  assert.equal(body.targetLanguage, 'English')
  assert.ok(body.image.startsWith('data:image/jpeg;base64,'))

  return new Response(
    JSON.stringify({
      detected: true,
      quality: 'good',
      kannadaText: 'ನಮ್ಮ ಮೆಟ್ರೋ',
      transliteration: 'Namma Metro',
      translatedText: 'Our Metro',
      targetLanguage: 'English',
      blocks: [
        {
          kannada: 'ನಮ್ಮ ಮೆಟ್ರೋ',
          translation: 'Our Metro',
          box2d: [120, 200, 350, 800],
        },
      ],
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
}

const mockImage = 'data:image/jpeg;base64,/9j/4AAQSkZJRg=='
const res1 = await scanAndTranslateImage(mockImage, 'English')
assert.equal(res1.detected, true)
assert.equal(res1.kannadaText, 'ನಮ್ಮ ಮೆಟ್ರೋ')
assert.equal(res1.transliteration, 'Namma Metro')
assert.equal(res1.translatedText, 'Our Metro')
assert.equal(res1.targetLanguage, 'English')
assert.equal(res1.blocks?.length, 1)
assert.deepEqual(res1.blocks?.[0].box2d, [120, 200, 350, 800])
console.log('✓ Passed\n')

// Test 2: No Text Detected State
console.log('Test 2: No Text Detected State handled gracefully')
mockFetchHandler = async () => {
  return new Response(
    JSON.stringify({
      detected: false,
      quality: 'no_text',
      error: 'No Kannada text was detected in this image. Please aim closer to signs or boards.',
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
}

const res2 = await scanAndTranslateImage(mockImage, 'English')
assert.equal(res2.detected, false)
assert.equal(res2.quality, 'no_text')
assert.ok(res2.error?.includes('No Kannada text was detected'))
console.log('✓ Passed\n')

// Test 3: Poor Image Quality State
console.log('Test 3: Blurry/Dark Image Quality State')
mockFetchHandler = async () => {
  return new Response(
    JSON.stringify({
      detected: false,
      quality: 'blurry',
      error: 'The image is too blurry to read clearly. Please hold steady and try with better lighting.',
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
}

const res3 = await scanAndTranslateImage(mockImage, 'Hindi')
assert.equal(res3.detected, false)
assert.equal(res3.quality, 'blurry')
assert.ok(res3.error?.includes('blurry'))
console.log('✓ Passed\n')

// Test 4: API Error (Missing Key or Service Down)
console.log('Test 4: Real API Error / Missing Key State')
mockFetchHandler = async () => {
  return new Response(
    JSON.stringify({
      error: 'Gemini API key is not configured on the server. Set GEMINI_API_KEY in your .env file.',
    }),
    { status: 503, headers: { 'Content-Type': 'application/json' } },
  )
}

await assert.rejects(
  async () => {
    await scanAndTranslateImage(mockImage, 'English')
  },
  { message: 'Gemini API key is not configured on the server. Set GEMINI_API_KEY in your .env file.' },
)
console.log('✓ Passed\n')

// Test 5: Re-translating Edited Kannada Text
console.log('Test 5: Re-translating edited Kannada text')
mockFetchHandler = async (url, init) => {
  assert.equal(url, '/api/translate')
  const body = JSON.parse(init?.body as string)
  assert.equal(body.sourceLanguage, 'Kannada')
  assert.equal(body.targetLanguage, 'Hindi')
  assert.equal(body.text, 'ಹೋಟೆಲ್ ಶಾಂತಿ ಸಾಗರ')

  return new Response(
    JSON.stringify({
      translation: 'होटल शांति सागर',
      transliteration: 'Hotel Shanti Sagara',
      kannada: 'ಹೋಟೆಲ್ ಶಾಂತಿ ಸಾಗರ',
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
}

const retrans = await retranslateKannada('ಹೋಟೆಲ್ ಶಾಂತಿ ಸಾಗರ', 'Hindi')
assert.equal(retrans.translation, 'होटल शांति सागर')
assert.equal(retrans.transliteration, 'Hotel Shanti Sagara')
console.log('✓ Passed\n')

// Test 6: Storing Camera Scan in Conversation History
console.log('Test 6: Saving Camera Scan into Persistent Conversation History')
const memoryStore = new Map<string, string>()
const mockStorage = {
  getItem: (k: string) => memoryStore.get(k) ?? null,
  setItem: (k: string, v: string) => memoryStore.set(k, v),
  removeItem: (k: string) => memoryStore.delete(k),
  clear: () => memoryStore.clear(),
}
;(globalThis as any).localStorage = mockStorage
;(globalThis as any).window = { indexedDB: undefined, localStorage: mockStorage }

await clearAllConversationEntries()
await addConversationEntry({
  id: 'cam-test-1',
  timestamp: Date.now(),
  sourceText: 'ಬೆಂಗಳೂರು ಮಹಾನಗರ ಸಾರಿಗೆ ಸಂಸ್ಥೆ',
  sourceLanguage: 'Kannada',
  targetLanguage: 'English',
  initialTranslation: {
    kannada: 'Bengaluru Metropolitan Transport Corporation (BMTC)',
    transliteration: 'Bengaluru Mahanagara Saarige Samsthe',
  },
  correctionStatus: 'original',
})

const historyEntries = await getConversationEntries()
assert.equal(historyEntries.length, 1)
assert.equal(historyEntries[0].sourceLanguage, 'Kannada')
assert.equal(historyEntries[0].targetLanguage, 'English')
assert.equal(historyEntries[0].sourceText, 'ಬೆಂಗಳೂರು ಮಹಾನಗರ ಸಾರಿಗೆ ಸಂಸ್ಥೆ')
assert.equal(historyEntries[0].initialTranslation.kannada, 'Bengaluru Metropolitan Transport Corporation (BMTC)')
console.log('✓ Passed\n')

console.log('🎉 All 6 Camera Translator Tests Passed Successfully!')
