import { Speech, Camera, WifiOff } from 'lucide-react'
import { cn } from '../lib/cn'

const BENEFITS = [
  {
    icon: Speech,
    title: 'Speak & Listen Naturally',
    description:
      'Say what you want in English or Hindi. Get instant, natural Kannada translation with phonetic pronunciation guides and speech playback.',
  },
  {
    icon: Camera,
    title: 'Read Real-World Kannada Signs',
    description:
      'Point your phone camera at metro directions, street names, government boards, and cafe menus to extract text and see translations side-by-side.',
  },
  {
    icon: WifiOff,
    title: 'Stay Connected Offline',
    description:
      'Download emergency, transport, shopping, and food phrase packs locally so you are never stranded during network cuts or low-connectivity zones.',
  },
] as const

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-24 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-forest-900/5 px-3.5 py-1.5 text-[13px] font-semibold tracking-[0.14em] text-forest-700 uppercase ring-1 ring-forest-900/10">
            Why NammaConnect
          </span>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-forest-900 sm:text-4xl">
            Designed for Life in Karnataka
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-ink-500">
            Thoughtfully built for newcomers, travellers, and locals alike — keeping everyday
            conversations respectful, fluent, and stress-free.
          </p>
        </div>

        <ul className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {BENEFITS.map(({ icon: Icon, title, description }) => (
            <li
              key={title}
              className={cn(
                'rounded-3xl bg-white p-7 shadow-soft ring-1 ring-forest-900/8',
                'transition-all duration-300 ease-out',
                'hover:-translate-y-1 hover:shadow-lifted hover:ring-forest-900/15',
              )}
            >
              <span
                className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-100 text-forest-800 ring-1 ring-forest-700/15"
                aria-hidden="true"
              >
                <Icon className="h-6 w-6" strokeWidth={1.9} />
              </span>
              <h3 className="mt-5 text-lg font-semibold tracking-tight text-forest-900">
                {title}
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-ink-500">
                {description}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
