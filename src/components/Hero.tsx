import { ArrowRight, AudioLines } from 'lucide-react'
import { WaveArt } from './WaveArt'
import { Button } from './ui/Button'

export function Hero() {
  const scrollToTranslator = () => {
    document.getElementById('translator')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section
      id="home"
      className="relative overflow-hidden pt-28 pb-16 sm:pt-36 sm:pb-24"
    >
      {/* Ambient page glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-40 h-[480px] bg-[radial-gradient(60%_60%_at_50%_50%,rgba(183,211,193,0.35),transparent_70%)]"
      />

      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 px-5 sm:px-8 lg:grid-cols-[1.05fr_0.95fr]">
        {/* Copy */}
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full bg-forest-900/5 px-3.5 py-1.5 text-[13px] font-medium text-forest-700 ring-1 ring-forest-900/10">
            <AudioLines className="h-3.5 w-3.5 text-amber-soft" aria-hidden="true" />
            ನಮ್ಮ ನಾಡು · ನಮ್ಮ ಭಾಷೆ
          </span>

          <h1 className="mt-6 font-display text-[42px] leading-[1.08] font-semibold tracking-tight text-forest-900 sm:text-[56px] lg:text-[64px]">
            Speak Freely.
            <br />
            <span className="text-forest-500">Connect in Kannada.</span>
          </h1>

          <p className="mt-5 max-w-md text-lg leading-relaxed text-ink-500">
            Making Kannada communication simpler, one conversation at a time.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3.5">
            <Button variant="primary" size="lg" onClick={scrollToTranslator}>
              Get Started
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button variant="secondary" size="lg" onClick={scrollToTranslator}>
              Explore the Interface
            </Button>
          </div>

          <p className="mt-6 text-[13px] leading-relaxed text-ink-400">
            Now with live speech recognition, Gemini-powered Kannada translation,
            and pronunciation playback.
          </p>
        </div>

        {/* Artwork */}
        <div
          className="animate-fade-up [animation-delay:120ms]"
          aria-hidden="true"
        >
          <WaveArt className="mx-auto max-w-[560px] drop-shadow-[0_20px_40px_rgba(18,41,30,0.08)]" />
        </div>
      </div>
    </section>
  )
}
