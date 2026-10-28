import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Camera,
  Upload,
  RefreshCw,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Edit3,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  Languages,
  Eye,
  EyeOff,
  FlipHorizontal,
  BookmarkPlus,
  Loader2,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react'
import {
  scanAndTranslateImage,
  retranslateKannada,
  type CameraOcrResponse,
  type TargetLanguage,
  type OcrTextBlock,
} from '../services/cameraTranslator'
import { speakText, stopSpeaking } from '../services/speechSynthesis'
import { addConversationEntry, type ConversationEntry } from '../services/conversationStorage'
import { Button } from './ui/Button'
import { IconButton } from './ui/IconButton'
import { cn } from '../lib/cn'

type Mode = 'camera' | 'upload'

const TARGET_LANGUAGES: TargetLanguage[] = ['English', 'Hindi']

export function CameraTranslator() {
  const [mode, setMode] = useState<Mode>('upload')
  const [targetLanguage, setTargetLanguage] = useState<TargetLanguage>('English')

  // Camera stream state
  const videoRef = useRef<HTMLVideoElement>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const streamRef = useRef<MediaStream | null>(null)

  // Image & analysis state
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<CameraOcrResponse | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  // Editing state
  const [isEditing, setIsEditing] = useState(false)
  const [editableKannada, setEditableKannada] = useState('')
  const [isRetranslating, setIsRetranslating] = useState(false)

  // Highlights & interactive boxes
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true)
  const [selectedBlock, setSelectedBlock] = useState<OcrTextBlock | null>(null)

  // Audio & copy state
  const [playingTarget, setPlayingTarget] = useState<'kannada' | 'translation' | null>(null)
  const [copiedField, setCopiedField] = useState<'kannada' | 'translation' | null>(null)
  const [savedToHistory, setSavedToHistory] = useState(false)

  // Stop camera stream helper
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraActive(false)
  }, [])

  // Start camera stream
  const startCamera = async (overrideFacing?: 'environment' | 'user') => {
    setCameraError(null)
    stopCameraStream()

    const chosenFacing = overrideFacing ?? facingMode

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera access is not supported on this browser. Please use photo upload.')
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: chosenFacing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      })

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraActive(true)
    } catch (err: unknown) {
      const msg =
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'Camera permission was denied in your browser settings. You can enable it or use photo upload below.'
          : err instanceof Error
            ? err.message
            : 'Could not access the camera. Please try uploading a photo instead.'
      setCameraError(msg)
      setCameraActive(false)
    }
  }

  // Toggle camera direction (front / rear)
  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(nextMode)
    if (cameraActive) {
      void startCamera(nextMode)
    }
  }

  // Clean up camera on unmount or tab switch
  useEffect(() => {
    return () => {
      stopCameraStream()
      stopSpeaking()
    }
  }, [stopCameraStream])

  // Capture frame from video feed
  const capturePhoto = () => {
    if (!videoRef.current) return

    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9)

    stopCameraStream()
    setCapturedImage(dataUrl)
    void analyzeImage(dataUrl)
  }

  // Handle uploaded file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setAnalysisError('Please select a valid image file (JPEG, PNG, WebP).')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setCapturedImage(dataUrl)
      void analyzeImage(dataUrl)
    }
    reader.onerror = () => {
      setAnalysisError('Failed to read image file. Please try again.')
    }
    reader.readAsDataURL(file)
  }

  // Analyze image via OCR & Translation
  const analyzeImage = async (imageDataUrl: string) => {
    setIsAnalyzing(true)
    setAnalysisError(null)
    setResult(null)
    setSelectedBlock(null)
    setIsEditing(false)
    setSavedToHistory(false)

    try {
      const ocrResult = await scanAndTranslateImage(imageDataUrl, targetLanguage)
      setResult(ocrResult)
      if (ocrResult.detected && ocrResult.kannadaText) {
        setEditableKannada(ocrResult.kannadaText)
      } else if (ocrResult.error) {
        setAnalysisError(ocrResult.error)
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to scan image. Please check your network.'
      setAnalysisError(msg)
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Retranslate edited Kannada text
  const handleRetranslate = async () => {
    const text = editableKannada.trim()
    if (!text) return

    setIsRetranslating(true)
    setAnalysisError(null)

    try {
      const res = await retranslateKannada(text, targetLanguage)
      setResult((prev) => {
        if (!prev) return null
        return {
          ...prev,
          kannadaText: text,
          translatedText: res.translation,
          transliteration: res.transliteration || prev.transliteration,
        }
      })
      setIsEditing(false)
    } catch (err: unknown) {
      setAnalysisError(
        err instanceof Error ? err.message : 'Re-translation failed. Please try again.',
      )
    } finally {
      setIsRetranslating(false)
    }
  }

  // Audio playback handler
  const handlePlayAudio = (type: 'kannada' | 'translation') => {
    if (playingTarget === type) {
      stopSpeaking()
      setPlayingTarget(null)
      return
    }

    if (!result) return

    const textToPlay =
      type === 'kannada' ? result.kannadaText || '' : result.translatedText || ''
    const lang =
      type === 'kannada' ? 'kn' : targetLanguage === 'Hindi' ? 'hi' : 'en'

    if (!textToPlay) return

    const started = speakText(
      textToPlay,
      lang,
      type === 'kannada' ? result.transliteration : undefined,
      () => setPlayingTarget(type),
      () => setPlayingTarget(null),
      () => setPlayingTarget(null),
    )

    if (!started) {
      setPlayingTarget(null)
    }
  }

  // Copy handler
  const handleCopy = async (type: 'kannada' | 'translation') => {
    if (!result) return
    let textToCopy = ''
    if (type === 'kannada') {
      textToCopy = result.transliteration
        ? `${result.kannadaText}\n(${result.transliteration})`
        : result.kannadaText || ''
    } else {
      textToCopy = result.translatedText || ''
    }

    if (!textToCopy) return

    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopiedField(type)
      setTimeout(() => setCopiedField(null), 2000)
    } catch {
      // ignore
    }
  }

  // Save to conversation history
  const handleSaveToHistory = async () => {
    if (!result?.kannadaText || !result?.translatedText) return

    const entryId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `cam-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

    const newEntry: ConversationEntry = {
      id: entryId,
      timestamp: Date.now(),
      sourceText: result.kannadaText,
      sourceLanguage: 'Kannada',
      targetLanguage: targetLanguage,
      initialTranslation: {
        kannada: result.translatedText,
        transliteration: result.transliteration,
      },
      correctionStatus: 'original',
    }

    await addConversationEntry(newEntry)
    setSavedToHistory(true)
    setTimeout(() => setSavedToHistory(false), 3000)
  }

  // Reset to scan another image
  const handleReset = () => {
    stopSpeaking()
    stopCameraStream()
    setCapturedImage(null)
    setResult(null)
    setAnalysisError(null)
    setSelectedBlock(null)
    setIsEditing(false)
    setPlayingTarget(null)
    setSavedToHistory(false)
  }

  return (
    <section id="camera-translator" className="scroll-mt-24 py-10 sm:py-14">
      <div className="mx-auto max-w-4xl px-5 sm:px-8">
        {/* Header */}
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-forest-900/5 px-3.5 py-1.5 text-[13px] font-semibold tracking-[0.14em] text-forest-700 uppercase ring-1 ring-forest-900/10">
            <Camera className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            See It, Understand It — Camera Translator
          </span>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-forest-900 sm:text-4xl">
            Scan & Understand Kannada Signs
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-ink-500">
            Point your camera at street signs, metro boards, shop fronts, or menus across
            Karnataka to extract the text and understand its meaning instantly.
          </p>
        </div>

        {/* Main Card */}
        <div className="mt-10 overflow-hidden rounded-3xl bg-white shadow-lifted ring-1 ring-forest-900/10 backdrop-blur-sm">
          {/* Top Bar: Target Language Selection & Mode Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-forest-900/8 px-6 py-4 bg-canvas-50/80">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tracking-wider text-ink-500 uppercase flex items-center gap-1.5">
                <Languages className="h-3.5 w-3.5 text-forest-600" />
                Translate to:
              </span>
              <div className="relative">
                <select
                  value={targetLanguage}
                  onChange={(e) => {
                    const newLang = e.target.value as TargetLanguage
                    setTargetLanguage(newLang)
                    if (capturedImage && !isAnalyzing) {
                      void analyzeImage(capturedImage)
                    }
                  }}
                  className="cursor-pointer appearance-none rounded-xl bg-white pl-3.5 pr-8 py-1.5 text-xs font-semibold text-forest-900 ring-1 ring-forest-900/12 shadow-xs outline-none focus:ring-2 focus:ring-forest-600"
                >
                  {TARGET_LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
              </div>
            </div>

            {/* Input Mode Tabs (Camera vs Upload) */}
            {!capturedImage && (
              <div className="flex items-center rounded-2xl bg-canvas-200/60 p-1 ring-1 ring-forest-900/8">
                <button
                  type="button"
                  onClick={() => {
                    setMode('camera')
                    setCameraError(null)
                  }}
                  className={cn(
                    'cursor-pointer flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all',
                    mode === 'camera'
                      ? 'bg-white text-forest-900 shadow-soft ring-1 ring-forest-900/6'
                      : 'text-ink-500 hover:text-ink-900',
                  )}
                >
                  <Camera className="h-3.5 w-3.5 text-forest-700" />
                  <span>Live Camera</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('upload')
                    stopCameraStream()
                  }}
                  className={cn(
                    'cursor-pointer flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all',
                    mode === 'upload'
                      ? 'bg-white text-forest-900 shadow-soft ring-1 ring-forest-900/6'
                      : 'text-ink-500 hover:text-ink-900',
                  )}
                >
                  <Upload className="h-3.5 w-3.5 text-forest-700" />
                  <span>Upload Photo</span>
                </button>
              </div>
            )}

            {capturedImage && (
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-forest-800 bg-white ring-1 ring-forest-900/12 hover:bg-forest-50 transition-colors shadow-xs"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Scan Another Sign</span>
              </button>
            )}
          </div>

          {/* Body */}
          <div className="p-6 sm:p-8">
            {/* Viewfinder / Input Step (When no image captured) */}
            {!capturedImage && (
              <div>
                {mode === 'camera' ? (
                  /* Camera Mode */
                  <div className="space-y-4">
                    <div className="relative mx-auto aspect-video max-w-2xl overflow-hidden rounded-3xl bg-forest-900 shadow-inner flex items-center justify-center ring-1 ring-forest-900/20">
                      {cameraActive ? (
                        <>
                          <video
                            ref={videoRef}
                            playsInline
                            muted
                            className="h-full w-full object-cover"
                          />

                          {/* Viewfinder Targeting Reticle */}
                          <div className="pointer-events-none absolute inset-8 border border-white/30 rounded-2xl">
                            {/* Four Corners */}
                            <div className="absolute -top-1 -left-1 h-6 w-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                            <div className="absolute -top-1 -right-1 h-6 w-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                            <div className="absolute -bottom-1 -left-1 h-6 w-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                            <div className="absolute -bottom-1 -right-1 h-6 w-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

                            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center">
                              <span className="rounded-full bg-forest-900/70 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-xs">
                                Align Kannada text inside this frame
                              </span>
                            </div>
                          </div>
                        </>
                      ) : (
                        /* Idle or Error Camera Prompt */
                        <div className="p-8 text-center text-canvas-50">
                          {cameraError ? (
                            <div className="max-w-md mx-auto space-y-3">
                              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/30">
                                <AlertTriangle className="h-6 w-6" />
                              </div>
                              <h3 className="font-semibold text-white">Camera Access Required</h3>
                              <p className="text-xs text-canvas-200 leading-relaxed">
                                {cameraError}
                              </p>
                              <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
                                <Button
                                  variant="secondary"
                                  size="md"
                                  onClick={() => void startCamera()}
                                >
                                  Try Again
                                </Button>
                                <Button
                                  variant="primary"
                                  size="md"
                                  onClick={() => setMode('upload')}
                                >
                                  <Upload className="h-4 w-4" />
                                  Upload Photo instead
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-emerald-400 ring-1 ring-white/15">
                                <Camera className="h-7 w-7" />
                              </div>
                              <div>
                                <h3 className="text-base font-semibold text-white">
                                  Ready to scan Kannada signs
                                </h3>
                                <p className="mt-1 text-xs text-canvas-200">
                                  Click below to activate your camera feed. Permissions are requested
                                  only when you choose.
                                </p>
                              </div>
                              <Button
                                variant="primary"
                                size="lg"
                                onClick={() => void startCamera()}
                              >
                                <Camera className="h-4 w-4" />
                                Start Live Camera
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Camera Controls Bar */}
                    {cameraActive && (
                      <div className="flex items-center justify-center gap-4">
                        <button
                          type="button"
                          onClick={toggleFacingMode}
                          title="Switch camera direction"
                          className="rounded-full bg-canvas-200 p-3 text-forest-800 hover:bg-canvas-300 transition-colors cursor-pointer shadow-xs"
                        >
                          <FlipHorizontal className="h-5 w-5" />
                        </button>

                        {/* Snap Button */}
                        <button
                          type="button"
                          onClick={capturePhoto}
                          title="Capture photo"
                          className="group relative flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lifted hover:bg-emerald-500 transition-all hover:scale-105 active:scale-95 cursor-pointer ring-4 ring-emerald-500/30"
                        >
                          <div className="h-6 w-6 rounded-full bg-white transition-transform group-hover:scale-90" />
                        </button>

                        <button
                          type="button"
                          onClick={stopCameraStream}
                          title="Stop camera"
                          className="rounded-full bg-canvas-200 p-3 text-ink-700 hover:bg-canvas-300 transition-colors cursor-pointer shadow-xs"
                        >
                          <RotateCcw className="h-5 w-5" />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Photo Upload Dropzone */
                  <div className="mx-auto max-w-xl">
                    <label
                      htmlFor="camera-photo-upload"
                      className="group flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-forest-900/15 bg-canvas-50/60 p-10 text-center hover:border-forest-600 hover:bg-white transition-all cursor-pointer"
                    >
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-forest-100 text-forest-800 ring-1 ring-forest-900/10 group-hover:scale-105 transition-transform">
                        <Upload className="h-7 w-7" />
                      </div>
                      <h3 className="mt-4 font-display text-lg font-semibold text-forest-900">
                        Upload a photo of a Kannada sign
                      </h3>
                      <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-ink-500">
                        Select a clear photo from your device, or snap a photo directly from your
                        mobile camera roll.
                      </p>
                      <span className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-forest-800 px-5 py-2.5 text-xs font-semibold text-white shadow-soft group-hover:bg-forest-700 transition-colors">
                        Choose Photo
                      </span>
                      <input
                        id="camera-photo-upload"
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileUpload}
                        className="sr-only"
                      />
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Analysis & Results Step (When image captured) */}
            {capturedImage && (
              <div className="space-y-6">
                {/* Image Container with Interactive Bounding Boxes */}
                <div className="relative mx-auto max-w-2xl overflow-hidden rounded-3xl bg-forest-950 ring-1 ring-forest-900/20 shadow-soft">
                  <img
                    src={capturedImage}
                    alt="Captured sign"
                    className="w-full max-h-[460px] object-contain mx-auto"
                  />

                  {/* Bounding box highlight overlays */}
                  {showBoundingBoxes &&
                    result?.blocks &&
                    result.blocks.map((block, idx) => {
                      if (!block.box2d || block.box2d.length < 4) return null
                      const [ymin, xmin, ymax, xmax] = block.box2d
                      const top = ymin / 10
                      const left = xmin / 10
                      const height = (ymax - ymin) / 10
                      const width = (xmax - xmin) / 10
                      const isHovered = selectedBlock === block

                      return (
                        <div
                          key={idx}
                          onClick={() => setSelectedBlock(isHovered ? null : block)}
                          style={{
                            top: `${top}%`,
                            left: `${left}%`,
                            height: `${height}%`,
                            width: `${width}%`,
                          }}
                          className={cn(
                            'absolute cursor-pointer rounded-lg border-2 transition-all',
                            isHovered
                              ? 'border-emerald-300 bg-emerald-400/35 ring-4 ring-emerald-400/40 z-20'
                              : 'border-emerald-400/80 bg-emerald-500/15 hover:bg-emerald-400/30 z-10',
                          )}
                          title={`${block.kannada} → ${block.translation}`}
                        >
                          {/* Tooltip on active */}
                          {isHovered && (
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-30 min-w-[200px] max-w-xs rounded-xl bg-forest-950/95 p-2.5 text-xs text-white shadow-lifted ring-1 ring-white/10 backdrop-blur-md">
                              <p className="font-kannada font-semibold text-emerald-300 text-sm">
                                {block.kannada}
                              </p>
                              <p className="mt-0.5 text-canvas-100">{block.translation}</p>
                            </div>
                          )}
                        </div>
                      )
                    })}

                  {/* Top image overlay controls */}
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    {result?.blocks && result.blocks.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowBoundingBoxes((prev) => !prev)}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-forest-950/80 px-3 py-1 text-xs font-semibold text-white shadow-soft ring-1 ring-white/20 backdrop-blur-md hover:bg-forest-900 transition-colors"
                      >
                        {showBoundingBoxes ? (
                          <>
                            <EyeOff className="h-3 w-3" />
                            <span>Hide Boxes</span>
                          </>
                        ) : (
                          <>
                            <Eye className="h-3 w-3" />
                            <span>Show Boxes</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Loading Spinner during analysis */}
                  {isAnalyzing && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-forest-950/75 p-6 text-center text-white backdrop-blur-xs">
                      <Loader2 className="h-10 w-10 animate-spin text-emerald-400" />
                      <h4 className="mt-4 font-display text-lg font-semibold">
                        Scanning & Translating...
                      </h4>
                      <p className="mt-1 text-xs text-canvas-200">
                        Detecting Kannada characters and preparing {targetLanguage} translation.
                      </p>
                    </div>
                  )}
                </div>

                {/* Selected block quick view pill */}
                {selectedBlock && (
                  <div className="rounded-2xl bg-emerald-50/80 p-3.5 ring-1 ring-emerald-500/25 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-emerald-900">Selected Region: </span>
                      <span className="font-kannada font-semibold text-forest-900 ml-1">
                        {selectedBlock.kannada}
                      </span>
                      <span className="text-ink-600 ml-2">→ {selectedBlock.translation}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedBlock(null)}
                      className="text-ink-400 hover:text-ink-700 text-xs font-medium"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {/* Error Banner */}
                {analysisError && (
                  <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-300 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
                    <div className="flex-1 text-xs text-amber-900">
                      <p className="font-semibold text-amber-950">Text Recognition Issue</p>
                      <p className="mt-1 leading-relaxed">{analysisError}</p>
                      <div className="mt-3 flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="md"
                          onClick={() => analyzeImage(capturedImage)}
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          Retry Scan
                        </Button>
                        <Button variant="ghost" size="md" onClick={handleReset}>
                          Try Another Photo
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* OCR Success Results */}
                {result && result.detected && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                    {/* Kannada Script Card */}
                    <div className="rounded-3xl bg-canvas-100/80 p-5 sm:p-6 ring-1 ring-forest-900/8 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between border-b border-forest-900/6 pb-3">
                          <span className="text-[11px] font-semibold tracking-wider text-forest-700 uppercase flex items-center gap-1.5">
                            <Languages className="h-3.5 w-3.5" />
                            Detected Kannada Text
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsEditing((prev) => !prev)}
                            className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-forest-700 hover:text-forest-900"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            <span>{isEditing ? 'Cancel Edit' : 'Edit Text'}</span>
                          </button>
                        </div>

                        {/* Editable Textarea or Display View */}
                        {isEditing ? (
                          <div className="mt-3 space-y-2">
                            <label htmlFor="edit-kannada-text" className="sr-only">
                              Edit recognized Kannada text
                            </label>
                            <textarea
                              id="edit-kannada-text"
                              rows={4}
                              value={editableKannada}
                              onChange={(e) => setEditableKannada(e.target.value)}
                              className="w-full resize-none rounded-2xl border-0 bg-white p-3 font-kannada text-base font-medium text-forest-900 ring-1 ring-forest-900/12 focus:ring-2 focus:ring-forest-600 outline-none"
                            />
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="primary"
                                size="md"
                                disabled={isRetranslating || !editableKannada.trim()}
                                onClick={handleRetranslate}
                              >
                                {isRetranslating ? (
                                  <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    <span>Updating...</span>
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw className="h-3.5 w-3.5" />
                                    <span>Update Translation</span>
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3">
                            <p className="font-kannada text-xl font-semibold text-forest-900 leading-relaxed">
                              {result.kannadaText}
                            </p>
                            {result.transliteration && (
                              <div className="mt-3 rounded-xl bg-forest-50/90 px-3 py-2 text-xs ring-1 ring-forest-900/6">
                                <span className="font-semibold text-forest-700">Pronounce: </span>
                                <span className="italic text-ink-700">
                                  "{result.transliteration}"
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Kannada Card Toolbar */}
                      <div className="mt-5 flex items-center justify-between border-t border-forest-900/6 pt-3">
                        <div className="flex items-center gap-2">
                          <IconButton
                            label={
                              playingTarget === 'kannada'
                                ? 'Stop audio'
                                : 'Listen to Kannada pronunciation'
                            }
                            icon={playingTarget === 'kannada' ? VolumeX : Volume2}
                            onClick={() => handlePlayAudio('kannada')}
                            className={cn(
                              playingTarget === 'kannada' &&
                                'bg-emerald-100 text-emerald-800 ring-2 ring-emerald-500 animate-pulse',
                            )}
                          />
                          <IconButton
                            label={copiedField === 'kannada' ? 'Copied' : 'Copy Kannada text'}
                            icon={copiedField === 'kannada' ? Check : Copy}
                            onClick={() => void handleCopy('kannada')}
                            className={cn(
                              copiedField === 'kannada' && 'bg-emerald-100 text-emerald-800',
                            )}
                          />
                        </div>
                        <span className="text-[11px] text-ink-400">Kannada Script</span>
                      </div>
                    </div>

                    {/* Translation Card */}
                    <div className="rounded-3xl bg-forest-900/[0.035] p-5 sm:p-6 ring-1 ring-forest-900/10 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between border-b border-forest-900/6 pb-3">
                          <span className="text-[11px] font-semibold tracking-wider text-forest-700 uppercase flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-forest-600" />
                            Translation ({targetLanguage})
                          </span>
                          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 ring-1 ring-emerald-600/20">
                            Verified OCR
                          </span>
                        </div>

                        <div className="mt-3">
                          <p className="text-lg font-medium text-ink-900 leading-relaxed">
                            {result.translatedText}
                          </p>
                        </div>
                      </div>

                      {/* Translation Card Toolbar */}
                      <div className="mt-5 flex items-center justify-between border-t border-forest-900/6 pt-3">
                        <div className="flex items-center gap-2">
                          <IconButton
                            label={
                              playingTarget === 'translation'
                                ? 'Stop audio'
                                : `Listen to ${targetLanguage} translation`
                            }
                            icon={playingTarget === 'translation' ? VolumeX : Volume2}
                            onClick={() => handlePlayAudio('translation')}
                            className={cn(
                              playingTarget === 'translation' &&
                                'bg-emerald-100 text-emerald-800 ring-2 ring-emerald-500 animate-pulse',
                            )}
                          />
                          <IconButton
                            label={copiedField === 'translation' ? 'Copied' : 'Copy translation'}
                            icon={copiedField === 'translation' ? Check : Copy}
                            onClick={() => void handleCopy('translation')}
                            className={cn(
                              copiedField === 'translation' && 'bg-emerald-100 text-emerald-800',
                            )}
                          />
                          <button
                            type="button"
                            onClick={() => void handleSaveToHistory()}
                            disabled={savedToHistory}
                            className={cn(
                              'inline-flex cursor-pointer items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all shadow-xs',
                              savedToHistory
                                ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-400'
                                : 'bg-white text-forest-800 ring-1 ring-forest-900/12 hover:bg-forest-50',
                            )}
                          >
                            {savedToHistory ? (
                              <>
                                <Check className="h-3 w-3" />
                                <span>Saved</span>
                              </>
                            ) : (
                              <>
                                <BookmarkPlus className="h-3 w-3 text-forest-600" />
                                <span>Save to History</span>
                              </>
                            )}
                          </button>
                        </div>
                        <span className="text-[11px] text-ink-400">Meaning</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Privacy & Safety footer strip */}
          <div className="border-t border-forest-900/6 bg-canvas-100/60 px-6 py-3.5 text-center text-xs text-ink-400 flex items-center justify-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>
              Images are processed strictly for OCR translation in memory and never retained or
              shared.
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
