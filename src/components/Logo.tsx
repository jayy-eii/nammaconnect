type LogoProps = {
  className?: string
}

/**
 * NammaConnect brand mark: a rounded leaf-green tile with an
 * abstract voice waveform, paired with the wordmark.
 */
export function Logo({ className }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ''}`}>
      <span
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-forest-800 shadow-soft"
        aria-hidden="true"
      >
        <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
          <rect x="0.5" y="5" width="2" height="4" rx="1" fill="#faf6ef" opacity="0.6" />
          <rect x="4" y="2.5" width="2" height="9" rx="1" fill="#faf6ef" opacity="0.85" />
          <rect x="7.5" y="0" width="2" height="14" rx="1" fill="#faf6ef" />
          <rect x="11" y="3" width="2" height="8" rx="1" fill="#faf6ef" opacity="0.85" />
          <rect x="14.5" y="5.5" width="2" height="3" rx="1" fill="#faf6ef" opacity="0.6" />
        </svg>
      </span>
      <span className="font-display text-[19px] font-semibold tracking-tight text-forest-900">
        Namma<span className="text-forest-500">Connect</span>
      </span>
    </span>
  )
}
