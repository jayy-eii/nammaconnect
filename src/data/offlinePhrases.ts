/**
 * Verified Everyday Spoken Phrases for NammaConnect Smart Offline Survival Kit.
 *
 * Accuracy & Safety Guarantees:
 * - Natural spoken Kannada as used daily in Karnataka (Bengaluru / Mysuru).
 * - Authentic Hindi and English translations.
 * - Accurate phonetic English transliteration guides.
 * - Categorized into 4 essential survival packs:
 *   1. Emergency & Hospital (ತುರ್ತು ಮತ್ತು ಆಸ್ಪತ್ರೆ)
 *   2. Bus & Auto (ಬಸ್ ಮತ್ತು ಆಟೋ)
 *   3. Shopping (ಶಾಪಿಂಗ್ ಮತ್ತು ಖರೀದಿ)
 *   4. Food & Restaurant (ಊಟ ಮತ್ತು ಉಪಹಾರ)
 */

export type PhraseCategory = 'emergency' | 'transport' | 'shopping' | 'food'

export interface OfflinePhrase {
  id: string
  category: PhraseCategory
  kannada: string
  transliteration: string
  english: string
  hindi: string
  safetyNote?: string
}

export interface PhrasePack {
  id: PhraseCategory
  title: string
  kannadaTitle: string
  description: string
  iconName: 'AlertCircle' | 'Bus' | 'ShoppingBag' | 'Utensils'
  phrases: OfflinePhrase[]
  approxSizeKb: number
}

export const OFFLINE_PHRASE_PACKS: PhrasePack[] = [
  {
    id: 'emergency',
    title: 'Emergency & Hospital',
    kannadaTitle: 'ತುರ್ತು ಮತ್ತು ಆಸ್ಪತ್ರೆ',
    description:
      'Urgent medical assistance, pharmacy questions, reporting distress, and safety phrases.',
    iconName: 'AlertCircle',
    approxSizeKb: 14,
    phrases: [
      {
        id: 'emg-1',
        category: 'emergency',
        kannada: 'ದಯವಿಟ್ಟು ನನಗೆ ಸಹಾಯ ಮಾಡಿ!',
        transliteration: 'Dayavittu nanage sahaaya maadi!',
        english: 'Please help me!',
        hindi: 'कृपया मेरी मदद करें!',
        safetyNote: 'Call 112 in India for emergency police/fire response.',
      },
      {
        id: 'emg-2',
        category: 'emergency',
        kannada: 'ಕೂಡಲೇ ಆಂಬುಲೆನ್ಸ್ ಕರೆಯಿರಿ.',
        transliteration: 'Koodale ambulance kareyiri.',
        english: 'Call an ambulance immediately.',
        hindi: 'तुरंत एम्बुलेंस बुलाएं।',
        safetyNote: 'Dial 108 directly for medical ambulance emergency in Karnataka.',
      },
      {
        id: 'emg-3',
        category: 'emergency',
        kannada: 'ಹತ್ತಿರದ ಆಸ್ಪತ್ರೆ ಎಲ್ಲಿದೆ?',
        transliteration: 'Hattirada aaspathre ellide?',
        english: 'Where is the nearest hospital?',
        hindi: 'नजदीकी अस्पताल कहाँ है?',
      },
      {
        id: 'emg-4',
        category: 'emergency',
        kannada: 'ನನಗೆ ಎದೆಯಲ್ಲಿ ವಿಪರೀತ ನೋವು ಇದೆ.',
        transliteration: 'Nanage edeyalli vipareetha novu ide.',
        english: 'I have severe chest pain.',
        hindi: 'मुझे सीने में बहुत तेज दर्द हो रहा है।',
        safetyNote: 'Requires urgent medical evaluation.',
      },
      {
        id: 'emg-5',
        category: 'emergency',
        kannada: 'ನನಗೆ ತಲೆ ತಿರುಗುತ್ತಿದೆ, ಸುಸ್ತಾಗುತ್ತಿದೆ.',
        transliteration: 'Nanage thale thirugutthide, susthaagutthide.',
        english: 'I feel dizzy and very weak.',
        hindi: 'मुझे चक्कर आ रहे हैं और बहुत कमजोरी लग रही है।',
      },
      {
        id: 'emg-6',
        category: 'emergency',
        kannada: 'ಮೆಡಿಕಲ್ ಶಾಪ್ / ಔಷಧಾಲಯ ಎಲ್ಲಿದೆ?',
        transliteration: 'Medical shop / aushadhaalaya ellide?',
        english: 'Where is the pharmacy / medical shop?',
        hindi: 'दवा की दुकान / मेडिकल स्टोर कहाँ है?',
      },
      {
        id: 'emg-7',
        category: 'emergency',
        kannada: 'ನನಗೆ ಈ ಔಷಧಿಯಿಂದ ಅಲರ್ಜಿ ಇದೆ.',
        transliteration: 'Nanage ee aushadhiyinda allergy ide.',
        english: 'I am allergic to this medicine.',
        hindi: 'मुझे इस दवा से एलर्जी है।',
        safetyNote: 'Show this to the pharmacist or doctor before taking medication.',
      },
      {
        id: 'emg-8',
        category: 'emergency',
        kannada: 'ನಾನು ದಾರಿ ತಪ್ಪಿದ್ದೇನೆ, ಸಹಾಯ ಮಾಡಿ.',
        transliteration: 'Naanu daari thappiddeene, sahaaya maadi.',
        english: 'I have lost my way, please help.',
        hindi: 'मैं रास्ता भटक गया हूँ, कृपया मदद करें।',
      },
      {
        id: 'emg-9',
        category: 'emergency',
        kannada: 'ಪೊಲೀಸರಿಗೆ ಕರೆ ಮಾಡಿ.',
        transliteration: 'Police-rige kare maadi.',
        english: 'Call the police.',
        hindi: 'पुलिस को फोन करें।',
        safetyNote: 'Dial 112 for police emergency in India.',
      },
    ],
  },
  {
    id: 'transport',
    title: 'Bus & Auto',
    kannadaTitle: 'ಬಸ್ ಮತ್ತು ಆಟೋ',
    description:
      'Hailing autorickshaws, BMTC buses, Namma Metro routes, fares, and navigation.',
    iconName: 'Bus',
    approxSizeKb: 15,
    phrases: [
      {
        id: 'trn-1',
        category: 'transport',
        kannada: 'ಮೀಟರ್ ಹಾಕಿ ಬರ್ತೀರಾ?',
        transliteration: 'Meter haaki bartheera?',
        english: 'Will you go by meter?',
        hindi: 'क्या आप मीटर से चलेंगे?',
      },
      {
        id: 'trn-2',
        category: 'transport',
        kannada: 'ಮೆಜೆಸ್ಟಿಕ್ / ಇಂದಿರಾನಗರಕ್ಕೆ ಎಷ್ಟು ಆಗುತ್ತೆ?',
        transliteration: 'Majestic / Indiranagar-kke eshtu aagutthe?',
        english: 'How much to Majestic / Indiranagar?',
        hindi: 'मैजेस्टिक / इंदिरानगर के कितने पैसे होंगे?',
      },
      {
        id: 'trn-3',
        category: 'transport',
        kannada: 'ದಯವಿಟ್ಟು ಇಲ್ಲಿ ಇಳಿಸಿ.',
        transliteration: 'Dayavittu illi ilisi.',
        english: 'Please drop me here.',
        hindi: 'कृपया मुझे यहाँ उतार दीजिए।',
      },
      {
        id: 'trn-4',
        category: 'transport',
        kannada: 'ಈ ಬಸ್ ಸಿಲ್ಕ್ ಬೋರ್ಡ್‌ಗೆ ಹೋಗುತ್ತಾ?',
        transliteration: 'Ee bus Silk Board-ge hogutthaa?',
        english: 'Does this bus go to Silk Board?',
        hindi: 'क्या यह बस सिल्क बोर्ड जाएगी?',
      },
      {
        id: 'trn-5',
        category: 'transport',
        kannada: 'ಏರ್‌ಪೋರ್ಟ್ ಬಸ್ (ವಾಯು ವಜ್ರ) ಯಾವ ಪ್ಲಾಟ್‌ಫಾರ್ಮ್‌ಗೆ ಬರುತ್ತೆ?',
        transliteration: 'Airport bus (Vayu Vajra) yaava platform-ge barutthe?',
        english: 'Which platform for the airport (Vayu Vajra) bus?',
        hindi: 'एयरपोर्ट वाली बस किस प्लेटफॉर्म पर आएगी?',
      },
      {
        id: 'trn-6',
        category: 'transport',
        kannada: 'ಮುಂದಿನ ಸ್ಟಾಪ್‌ನಲ್ಲಿ ಬಸ್ ನಿಲ್ಲಿಸಿ.',
        transliteration: 'Mundina stop-nalli bus nillisi.',
        english: 'Please stop at the next bus stop.',
        hindi: 'कृपया अगले स्टॉप पर बस रोकिए।',
      },
      {
        id: 'trn-7',
        category: 'transport',
        kannada: 'ಒಂದು ಟಿಕೆಟ್ ಕೊಡಿ, ದಯವಿಟ್ಟು.',
        transliteration: 'Ondu ticket kodi, dayavittu.',
        english: 'Please give one ticket.',
        hindi: 'कृपया एक टिकट दीजिए।',
      },
      {
        id: 'trn-8',
        category: 'transport',
        kannada: 'ನೇರವಾಗಿ ಹೋಗಿ, ಆಮೇಲೆ ಬಲಗಡೆ ತಿರುಗಿ.',
        transliteration: 'Neravaagi hogi, aamele balagade thirugi.',
        english: 'Go straight, then take a right turn.',
        hindi: 'सीधे जाइए, फिर दाएं मुड़िए।',
      },
      {
        id: 'trn-9',
        category: 'transport',
        kannada: 'ನಮ್ಮ ಮೆಟ್ರೋ ನಿಲ್ದಾಣ ಎಷ್ಟು ದೂರ ಇದೆ?',
        transliteration: 'Namma Metro nildaana eshtu doora ide?',
        english: 'How far is the Namma Metro station?',
        hindi: 'नम्मा मेट्रो स्टेशन कितनी दूर है?',
      },
    ],
  },
  {
    id: 'shopping',
    title: 'Shopping & Markets',
    kannadaTitle: 'ಶಾಪಿಂಗ್ ಮತ್ತು ಖರೀದಿ',
    description:
      'Negotiating prices, asking for discounts, paying via UPI, and requesting receipts.',
    iconName: 'ShoppingBag',
    approxSizeKb: 13,
    phrases: [
      {
        id: 'shp-1',
        category: 'shopping',
        kannada: 'ಇದರ ಬೆಲೆ ಎಷ್ಟು?',
        transliteration: 'Idara bele eshtu?',
        english: 'How much does this cost?',
        hindi: 'यह कितने का है?',
      },
      {
        id: 'shp-2',
        category: 'shopping',
        kannada: 'ಸ್ವಲ್ಪ ಕಡಿಮೆ ಮಾಡ್ತೀರಾ?',
        transliteration: 'Swalpa kadime maadtheera?',
        english: 'Can you reduce the price a bit?',
        hindi: 'थोड़ा कम करेंगे क्या?',
      },
      {
        id: 'shp-3',
        category: 'shopping',
        kannada: 'ಯುಪಿಐ / ಗೂಗಲ್ ಪೇ ತಗೋತೀರಾ?',
        transliteration: 'UPI / Google Pay thagotheera?',
        english: 'Do you accept UPI / Google Pay / PhonePe?',
        hindi: 'क्या आप UPI / Google Pay लेते हैं?',
      },
      {
        id: 'shp-4',
        category: 'shopping',
        kannada: 'ಇದು ಬೇಡ, ಬೇರೆ ತೋರಿಸಿ.',
        transliteration: 'Idu beda, bere thorisi.',
        english: 'I do not want this, please show another.',
        hindi: 'यह नहीं चाहिए, दूसरा दिखाइए।',
      },
      {
        id: 'shp-5',
        category: 'shopping',
        kannada: 'ಇದು ಒಂದು ಕೆಜಿ ಕೊಡಿ.',
        transliteration: 'Idu ondu kg kodi.',
        english: 'Please give one kilogram of this.',
        hindi: 'यह एक किलो दीजिए।',
      },
      {
        id: 'shp-6',
        category: 'shopping',
        kannada: 'ತಾಜಾ ಇರೋದು ಇದೆಯಾ?',
        transliteration: 'Taajaa irodu ideyaa?',
        english: 'Do you have fresh stock?',
        hindi: 'क्या ताजा सामान है?',
      },
      {
        id: 'shp-7',
        category: 'shopping',
        kannada: 'ದಯವಿಟ್ಟು ಒಂದು ಕ್ಯಾರಿ ಬ್ಯಾಗ್ ಕೊಡಿ.',
        transliteration: 'Dayavittu ondu carry bag kodi.',
        english: 'Please give a carry bag.',
        hindi: 'कृपया एक थैली दीजिए।',
      },
      {
        id: 'shp-8',
        category: 'shopping',
        kannada: 'ದಯವಿಟ್ಟು ಬಿಲ್ ಕೊಡಿ.',
        transliteration: 'Dayavittu bill kodi.',
        english: 'Please provide a bill / receipt.',
        hindi: 'कृपया बिल दीजिए।',
      },
    ],
  },
  {
    id: 'food',
    title: 'Food & Restaurant',
    kannadaTitle: 'ಊಟ ಮತ್ತು ಉಪಹಾರ',
    description:
      'Ordering filter coffee, South Indian thali, dietary requests, and settling restaurant bills.',
    iconName: 'Utensils',
    approxSizeKb: 14,
    phrases: [
      {
        id: 'fod-1',
        category: 'food',
        kannada: 'ಒಂದು ಫಿಲ್ಟರ್ ಕಾಫಿ ಕೊಡಿ.',
        transliteration: 'Ondu filter coffee kodi.',
        english: 'Please give one cup of filter coffee.',
        hindi: 'एक कप फ़िल्टर कॉफ़ी दीजिए।',
      },
      {
        id: 'fod-2',
        category: 'food',
        kannada: 'ಖಾರ ಕಡಿಮೆ ಮಾಡಿ, ದಯವಿಟ್ಟು.',
        transliteration: 'Khaara kadime maadi, dayavittu.',
        english: 'Please make it less spicy.',
        hindi: 'कृपया तीखा कम रखिएगा।',
      },
      {
        id: 'fod-3',
        category: 'food',
        kannada: 'ಇಲ್ಲಿ ಶುದ್ಧ ಸಸ್ಯಾಹಾರಿ ಊಟ ಸಿಗುತ್ತಾ?',
        transliteration: 'Illi shuddha sasyaahaari oota sigutthaa?',
        english: 'Is pure vegetarian food available here?',
        hindi: 'क्या यहाँ शुद्ध शाकाहारी भोजन मिलेगा?',
      },
      {
        id: 'fod-4',
        category: 'food',
        kannada: 'ಕುಡಿಯುವ ನೀರು ಕೊಡಿ, ದಯವಿಟ್ಟು.',
        transliteration: 'Kudiyuva neeru kodi, dayavittu.',
        english: 'Please give drinking water.',
        hindi: 'कृपया पीने का पानी दीजिए।',
      },
      {
        id: 'fod-5',
        category: 'food',
        kannada: 'ಇವತ್ತಿನ ಸ್ಪೆಷಲ್ ಊಟ ಏನು?',
        transliteration: 'Ivatthina special oota enu?',
        english: 'What is today’s special meal/dish?',
        hindi: 'आज का स्पेशल खाना क्या है?',
      },
      {
        id: 'fod-6',
        category: 'food',
        kannada: 'ಸಕ್ಕರೆ ಬೇಡ / ಸಕ್ಕರೆ ಹಾಕಬೇಡಿ.',
        transliteration: 'Sakkare beda / sakkare haakabedi.',
        english: 'No sugar, please do not add sugar.',
        hindi: 'चीनी मत डालिएगा / बिना चीनी का दीजिए।',
      },
      {
        id: 'fod-7',
        category: 'food',
        kannada: 'ಎರಡು ಪ್ಲೇಟ್ ಇಡ್ಲಿ ವಡೆ ಕೊಡಿ.',
        transliteration: 'Eradu plate idli vade kodi.',
        english: 'Please give two plates of idli vada.',
        hindi: 'दो प्लेट इडली वड़ा दीजिए।',
      },
      {
        id: 'fod-8',
        category: 'food',
        kannada: 'ಬಿಲ್ ತನ್ನಿ, ದಯವಿಟ್ಟು.',
        transliteration: 'Bill thanni, dayavittu.',
        english: 'Please bring the bill.',
        hindi: 'कृपया बिल ले आइए।',
      },
    ],
  },
]

/**
 * Returns all phrases across all packs.
 */
export function getAllPhrases(): OfflinePhrase[] {
  return OFFLINE_PHRASE_PACKS.flatMap((pack) => pack.phrases)
}

/**
 * Returns a pack by category id.
 */
export function getPackById(id: PhraseCategory): PhrasePack | undefined {
  return OFFLINE_PHRASE_PACKS.find((pack) => pack.id === id)
}
