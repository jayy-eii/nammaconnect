import { Logo } from './Logo'

// Computed once at module scope to keep component rendering pure.
const CURRENT_YEAR = new Date().getFullYear()

export function SiteFooter() {
  return (
    <footer id="about" className="scroll-mt-24 border-t border-forest-900/8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-12 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="max-w-md">
          <Logo />
          <p className="mt-3 text-[13.5px] leading-relaxed text-ink-500">
            NammaConnect is a new product helping people communicate in
            Kannada — currently in design. Real voice and translation
            features are on the way.
          </p>
        </div>
        <p className="text-[13px] text-ink-400">
          © {CURRENT_YEAR} NammaConnect
        </p>
      </div>
    </footer>
  )
}
