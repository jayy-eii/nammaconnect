import { cn } from '../lib/cn'

/**
 * Abstract, conversation-inspired artwork for the hero: gentle
 * sound waves flowing between two translucent speech forms.
 * Purely decorative SVG, restrained motion that respects
 * `prefers-reduced-motion` (handled globally in index.css).
 */
export function WaveArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 560 420"
      fill="none"
      role="img"
      aria-label="Abstract sound waves symbolising conversation"
      className={cn('h-auto w-full select-none', className)}
    >
      {/* Soft background blobs */}
      <ellipse cx="300" cy="210" rx="250" ry="190" fill="#dcebe0" opacity="0.55" />
      <ellipse cx="210" cy="160" rx="140" ry="110" fill="#e9dfcc" opacity="0.5" />

      {/* Concentric halo rings */}
      <circle cx="330" cy="200" r="150" stroke="#b7d3c1" strokeWidth="1.4" opacity="0.7" />
      <circle cx="330" cy="200" r="112" stroke="#b7d3c1" strokeWidth="1.4" opacity="0.55" />
      <circle cx="330" cy="200" r="74" stroke="#8ab59a" strokeWidth="1.4" opacity="0.6" />

      {/* Speech-form on the left (source) */}
      <rect
        x="52"
        y="128"
        width="168"
        height="96"
        rx="28"
        fill="#faf6ef"
        stroke="#d8c9ab"
        strokeWidth="1.4"
      />
      <path
        d="M92 224 l10 30 28 -30 z"
        fill="#faf6ef"
        stroke="#d8c9ab"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />

      {/* Speech-form on the right (target) */}
      <rect
        x="330"
        y="176"
        width="178"
        height="110"
        rx="30"
        fill="#234e38"
      />
      <path
        d="M372 286 l-12 32 34 -32 z"
        fill="#234e38"
        strokeLinejoin="round"
      />

      {/* Central waveform, gently animated */}
      <g>
        <g className="origin-center" style={{ animation: 'fade-up 1.2s ease-out both' }}>
          {[
            { x: 248, y: 168, h: 22, o: 0.45 },
            { x: 264, y: 158, h: 42, o: 0.6 },
            { x: 280, y: 146, h: 66, o: 0.8 },
            { x: 296, y: 138, h: 82, o: 0.95 },
            { x: 312, y: 146, h: 66, o: 0.8 },
            { x: 328, y: 158, h: 42, o: 0.6 },
            { x: 344, y: 168, h: 22, o: 0.45 },
            { x: 360, y: 176, h: 10, o: 0.35 },
          ].map((bar, index) => (
            <rect
              key={bar.x}
              x={bar.x}
              y={200 - bar.h / 2}
              width="8"
              height={bar.h}
              rx="4"
              fill="#3b7a58"
              opacity={bar.o}
            >
              <animate
                attributeName="height"
                values={`${bar.h}; ${bar.h * 0.55}; ${bar.h}`}
                dur={`${2.4 + index * 0.35}s`}
                repeatCount="indefinite"
                calcMode="spline"
                keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"
              />
              <animate
                attributeName="y"
                values={`${200 - bar.h / 2}; ${200 - (bar.h * 0.55) / 2}; ${200 - bar.h / 2}`}
                dur={`${2.4 + index * 0.35}s`}
                repeatCount="indefinite"
                calcMode="spline"
                keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"
              />
            </rect>
          ))}
        </g>
      </g>

      {/* Flow lines from source speech to waveform */}
      <path
        d="M224 176 C 252 168, 260 176, 244 200"
        stroke="#8ab59a"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeDasharray="1 9"
      />
      <path
        d="M232 196 C 258 194, 262 198, 250 214"
        stroke="#8ab59a"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeDasharray="1 9"
      />

      {/* Flow lines from waveform to target speech */}
      <path
        d="M368 202 C 342 200, 336 206, 348 226"
        stroke="#8ab59a"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeDasharray="1 9"
      />
      <path
        d="M382 210 C 358 214, 354 220, 362 240"
        stroke="#8ab59a"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeDasharray="1 9"
      />

      {/* Inside source speech: quiet line pattern */}
      <g opacity="0.4">
        <rect x="84" y="164" width="76" height="5" rx="2.5" fill="#cbb98f" />
        <rect x="84" y="180" width="104" height="5" rx="2.5" fill="#e0d2b2" />
        <rect x="84" y="196" width="52" height="5" rx="2.5" fill="#e0d2b2" />
      </g>

      {/* Inside target speech: Kannada-inspired glyph hints (abstract) */}
      <g opacity="0.55">
        <circle cx="372" cy="212" r="9" stroke="#e9dfcc" strokeWidth="2.4" />
        <circle cx="416" cy="212" r="9" stroke="#b7d3c1" strokeWidth="2.4" />
        <path
          d="M444 200 v18 a9 9 0 0 0 18 0"
          stroke="#e9dfcc"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <rect x="366" y="248" width="98" height="5" rx="2.5" fill="#b7d3c1" />
      </g>

      {/* Ambient dots */}
      <circle cx="120" cy="96" r="5" fill="#e8a13c" opacity="0.7" />
      <circle cx="480" cy="120" r="7" fill="#b7d3c1" />
      <circle cx="90" cy="330" r="6" fill="#b7d3c1" opacity="0.8" />
      <circle cx="500" cy="330" r="4" fill="#e8a13c" opacity="0.5" />
    </svg>
  )
}
