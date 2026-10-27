import { HeartHandshake, Speech, Ear } from 'lucide-react'
import { cn } from '../lib/cn'

const BENEFITS = [
  {
    icon: Speech,
    title: 'Speak Naturally',
    description:
      'The goal: say what you want to say, in your own words, without switching languages mid-sentence.',
  },
  {
    icon: Ear,
    title: 'Understand Kannada',
    description:
      'The goal: catch what neighbours, vendors and elders say — and follow the conversation with ease.',
  },
  {
    icon: HeartHandshake,
    title: 'Connect with Confidence',
    description:
      'The goal: move through everyday encounters feeling fluent, present, and at home.',
  },
] as const

/**
 * Compact benefits section. Copy is framed as the product's
 * intended goals — not proven capabilities — to stay honest
 * while the real features are being built.
 */
export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-24 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-forest-900 sm:text-4xl">
            What NammaConnect is aiming for
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-ink-500">
            Three simple outcomes we are building toward, one conversation at a time.
          </p>
        </div>

        <ul className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {BENEFITS.map(({ icon: Icon, title, description }) => (
            <li
              key={title}
              className={cn(
                'rounded-3xl bg-white/70 p-7 shadow-soft ring-1 ring-forest-900/8',
                'transition-all duration-300 ease-out',
                'hover:-translate-y-1 hover:bg-white hover:shadow-lifted hover:ring-forest-900/12',
              )}
            >
              <span
                className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-50 text-forest-600 ring-1 ring-forest-900/8"
                aria-hidden="true"
              >
                <Icon className="h-5.5 w-5.5" strokeWidth={1.8} />
              </span>
              <h3 className="mt-5 text-lg font-semibold tracking-tight text-forest-900">
                {title}
              </h3>
              <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink-500">
                {description}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
