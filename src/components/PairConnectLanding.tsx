import { BookUser, KeyRound, MessagesSquare, UserPlus } from 'lucide-react'
import { Button } from './ui/Button'

interface PairConnectLandingProps {
  onCreateRoom: () => void
  onJoinRoom: () => void
}

const STEPS = [
  {
    icon: BookUser,
    title: 'Create or join a room',
    description: 'One person opens a room and shares its code or QR with a friend nearby.',
  },
  {
    icon: KeyRound,
    title: 'Each picks their language',
    description: 'You speak yours, they speak theirs — Kannada, English, or Hindi.',
  },
  {
    icon: MessagesSquare,
    title: 'Chat across languages',
    description: 'Every message is translated both ways so you can understand each other.',
  },
] as const

/**
 * Landing screen for Pair Connect Mode. Original decorative
 * illustration (inline SVG, no external requests).
 */
export function PairConnectLanding({ onCreateRoom, onJoinRoom }: PairConnectLandingProps) {
  return (
    <div className="animate-fade-up">
      <div className="overflow-hidden rounded-3xl bg-white shadow-lifted ring-1 ring-forest-900/10">
        <div className="grid grid-cols-1 items-center gap-10 p-7 sm:p-10 lg:grid-cols-[1.15fr_0.85fr]">
          {/* Copy & CTAs */}
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-forest-900 sm:text-4xl">
              Connect Beyond Language
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-500">
              Talk to someone in their language, from your own phone.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button variant="primary" size="lg" onClick={onCreateRoom} className="gap-2">
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                <span>Create a Room</span>
              </Button>
              <Button variant="secondary" size="lg" onClick={onJoinRoom} className="gap-2">
                <KeyRound className="h-4 w-4 text-forest-700" aria-hidden="true" />
                <span>Join a Room</span>
              </Button>
            </div>

            {/* Three-step explainer */}
            <ol className="mt-9 space-y-5 border-t border-forest-900/8 pt-7">
              {STEPS.map(({ icon: Icon, title, description }, index) => (
                <li key={title} className="flex items-start gap-3.5">
                  <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-forest-100 text-forest-800 ring-1 ring-forest-700/15">
                    <Icon className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
                    <span
                      className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-forest-800 font-display text-[10px] font-semibold text-canvas-50"
                      aria-hidden="true"
                    >
                      {index + 1}
                    </span>
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-forest-900">{title}</h3>
                    <p className="mt-1 text-[13px] leading-relaxed text-ink-500">{description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Illustration */}
          <div className="flex justify-center" aria-hidden="true">
            <PairConversationArt className="max-w-[380px] drop-shadow-[0_20px_40px_rgba(23,61,45,0.08)]" />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Conversation-themed illustration: two people speaking separate languages,
 * bridged by a shared voice wave. Purely decorative inline SVG.
 */
function PairConversationArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 460 340"
      fill="none"
      className={`h-auto w-full select-none ${className ?? ''}`}
    >
      {/* Soft backdrop */}
      <ellipse cx="230" cy="170" rx="200" ry="150" fill="#E6EEE5" opacity="0.55" />
      <circle cx="230" cy="170" r="110" stroke="#C2D7C5" strokeWidth="1.4" opacity="0.6" />

      {/* Left person bubble ("you") */}
      <rect x="34" y="78" width="150" height="110" rx="26" fill="#FFFFFF" stroke="#C2D7C5" strokeWidth="1.6" />
      <path d="M78 188 l-12 32 36 -32 z" fill="#FFFFFF" stroke="#C2D7C5" strokeWidth="1.6" strokeLinejoin="round" />
      {/* Left person */}
      <circle cx="82" cy="112" r="13" fill="#173D2D" />
      <path d="M62 152 a20 20 0 0 1 40 0" stroke="#173D2D" strokeWidth="7" strokeLinecap="round" />
      <rect x="116" y="112" width="46" height="5" rx="2.5" fill="#C2D7C5" />
      <rect x="116" y="128" width="56" height="5" rx="2.5" fill="#E1EAE1" />
      <rect x="116" y="150" width="18" height="5" rx="2.5" fill="#E1EAE1" />
      <circle cx="150" cy="152.5" r="2.5" fill="#F4C66A" />

      {/* Right person bubble ("them") */}
      <rect x="276" y="152" width="150" height="110" rx="26" fill="#173D2D" />
      <path d="M382 262 l12 -32 -36 32 z" fill="#173D2D" strokeLinejoin="round" />
      {/* Right person */}
      <circle cx="378" cy="186" r="13" fill="#E6EEE5" />
      <path d="M358 226 a20 20 0 0 1 40 0" stroke="#E6EEE5" strokeWidth="7" strokeLinecap="round" />
      {/* Kannada-inspired glyph hints */}
      <circle cx="300" cy="196" r="8" stroke="#8EB795" strokeWidth="2.2" />
      <path d="M330 206 v16 a8 8 0 0 0 16 0" stroke="#E6EEE5" strokeWidth="2.2" strokeLinecap="round" />
      <rect x="296" y="236" width="76" height="5" rx="2.5" fill="#2A4F3E" />

      {/* Bridging waveform between the two bubbles */}
      {[
        { x: 214, h: 18, o: 0.5 },
        { x: 226, h: 34, o: 0.7 },
        { x: 238, h: 52, o: 0.95 },
        { x: 250, h: 34, o: 0.7 },
        { x: 262, h: 18, o: 0.5 },
      ].map((bar) => (
        <rect
          key={bar.x}
          x={bar.x}
          y={136 - bar.h / 2}
          width="7"
          height={bar.h}
          rx="3.5"
          fill="#26734D"
          opacity={bar.o}
        >
          <animate
            attributeName="height"
            values={`${bar.h}; ${bar.h * 0.55}; ${bar.h}`}
            dur="2.6s"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"
          />
          <animate
            attributeName="y"
            values={`${136 - bar.h / 2}; ${136 - (bar.h * 0.55) / 2}; ${136 - bar.h / 2}`}
            dur="2.6s"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"
          />
        </rect>
      ))}

      {/* Dotted flow arcs both ways */}
      <path d="M196 118 C 224 100, 240 104, 258 122" stroke="#8EB795" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="1 8" />
      <path d="M262 214 C 234 232, 218 228, 200 210" stroke="#8EB795" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="1 8" />

      {/* Ambient accents */}
      <circle cx="70" cy="56" r="5" fill="#F4C66A" opacity="0.8" />
      <circle cx="404" cy="96" r="6" fill="#8EB795" />
      <circle cx="410" cy="292" r="4" fill="#F4C66A" opacity="0.6" />
      <circle cx="54" cy="286" r="6" fill="#8EB795" opacity="0.7" />

      {/* Screen-reader-only summary */}
      <title>Two people communicating across languages through a shared voice wave</title>
    </svg>
  )
}
