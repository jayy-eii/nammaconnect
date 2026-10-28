import { ArrowRight, AudioLines, Camera, WifiOff, Sparkles, ShieldCheck } from 'lucide-react'
import { WaveArt } from './WaveArt'
import { Button } from './ui/Button'

export function Hero() {
  const scrollToTranslator = () => {
    document.getElementById('translator')?.scrollIntoView({ behavior: 'smooth' })
  }

  const scrollToCamera = () => {
    document.getElementById('camera-translator')?.scrollIntoView({ behavior: 'smooth' })
  }

  const scrollToOffline = () => {
    document.getElementById('offline-kit')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section
      id="home"
      className="relative overflow-hidden pt-28 pb-16 sm:pt-36 sm:pb-24"
    >
      {/* Ambient page glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-40 h-[520px] bg-[radial-gradient(65%_65%_at_50%_45%,rgba(194,215,197,0.38),transparent_70%)]"
      />

      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-5 sm:px-8 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Copy */}
        <div className="animate-fade-up">
          {/* Badge Row */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-2 rounded-full bg-forest-900/5 px-3.5 py-1.5 text-[13px] font-semibold text-forest-800 ring-1 ring-forest-900/10">
              <AudioLines className="h-3.5 w-3.5 text-amber-soft" aria-hidden="true" />
              <span>ನಮ್ಮ ನಾಡು · ನಮ್ಮ ಭಾಷೆ</span>
            </span>

            <button
              type="button"
              onClick={scrollToCamera}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[12px] font-semibold text-emerald-800 ring-1 ring-emerald-500/25 hover:bg-emerald-100 transition-all hover:scale-[1.02] shadow-xs"
            >
              <Camera className="h-3.5 w-3.5 text-emerald-600" />
              <span>Camera Scan</span>
            </button>

            <button
              type="button"
              onClick={scrollToOffline}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[12px] font-semibold text-amber-900 ring-1 ring-amber-400/35 hover:bg-amber-100 transition-all hover:scale-[1.02] shadow-xs"
            >
              <WifiOff className="h-3.5 w-3.5 text-amber-700" />
              <span>Offline Survival Kit</span>
            </button>
          </div>

          <h1 className="mt-6 font-display text-[44px] leading-[1.06] font-semibold tracking-tight text-forest-900 sm:text-[58px] lg:text-[66px]">
            Speak Freely.
            <br />
            <span className="text-forest-500">Connect in Kannada.</span>
          </h1>

          <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-500">
            Communicate naturally across Karnataka. Speak or type in English or Hindi, scan Kannada
            street signs and metro boards, and access verified offline survival phrases during network outages.
          </p>

          {/* CTA Buttons */}
          <div className="mt-8 flex flex-wrap items-center gap-3.5">
            <Button variant="primary" size="lg" onClick={scrollToTranslator} className="gap-2">
              <span>Start Voice & Text</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button variant="secondary" size="lg" onClick={scrollToCamera} className="gap-2">
              <Camera className="h-4 w-4 text-emerald-700" aria-hidden="true" />
              <span>Scan Signs</span>
            </Button>
            <button
              type="button"
              onClick={scrollToOffline}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-3 text-sm font-semibold text-forest-800 hover:text-forest-900 hover:bg-forest-900/5 transition-colors"
            >
              <WifiOff className="h-4 w-4 text-forest-600" />
              <span>Offline Kit</span>
            </button>
          </div>

          {/* Trust and feature highlights */}
          <div className="mt-9 pt-7 border-t border-forest-900/8 grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="text-xs font-medium text-ink-500">Gemini 2.5 Flash AI</span>
            </div>
            <div className="flex items-center gap-2">
              <WifiOff className="h-4 w-4 text-amber-600 shrink-0" />
              <span className="text-xs font-medium text-ink-500">PWA Offline Caching</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-forest-600 shrink-0" />
              <span className="text-xs font-medium text-ink-500">IndexedDB Correction Trail</span>
            </div>
          </div>
        </div>

        {/* Artwork */}
        <div
          className="animate-fade-up [animation-delay:120ms] flex justify-center"
          aria-hidden="true"
        >
          <WaveArt className="mx-auto max-w-[540px] drop-shadow-[0_20px_40px_rgba(23,61,45,0.08)]" />
        </div>
      </div>
    </section>
  )
}
