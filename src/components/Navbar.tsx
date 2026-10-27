import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Logo } from './Logo'
import { Button } from './ui/Button'
import { cn } from '../lib/cn'

const NAV_LINKS = [
  { label: 'Home', href: '#home' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'About', href: '#about' },
] as const

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const closeMenu = () => setMenuOpen(false)

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-canvas-100/85 shadow-soft ring-1 ring-forest-900/6 backdrop-blur-md'
          : 'bg-transparent',
      )}
    >
      <nav
        aria-label="Main navigation"
        className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8"
      >
        <a
          href="#home"
          onClick={closeMenu}
          className="rounded-lg outline-offset-4 focus-visible:outline-2 focus-visible:outline-forest-600"
        >
          <Logo />
        </a>

        {/* Desktop links */}
        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium text-ink-700',
                'transition-colors duration-200 hover:bg-forest-900/5 hover:text-forest-900',
                'outline-offset-2 focus-visible:outline-2 focus-visible:outline-forest-600',
              )}
            >
              {link.label}
            </a>
          ))}
          <a href="#translator" className="ml-3">
            <Button variant="primary">Get Started</Button>
          </a>
        </div>

        {/* Mobile menu toggle */}
        <button
          type="button"
          className={cn(
            'inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-ink-700 md:hidden',
            'outline-offset-2 focus-visible:outline-2 focus-visible:outline-forest-600',
          )}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? (
            <X className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </nav>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div
          id="mobile-menu"
          className="px-5 pb-4 md:hidden"
        >
          <div className="flex flex-col gap-1 rounded-2xl bg-canvas-50 p-3 shadow-lifted ring-1 ring-forest-900/8">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={closeMenu}
                className={cn(
                  'rounded-xl px-4 py-2.5 text-sm font-medium text-ink-700',
                  'transition-colors hover:bg-forest-50 hover:text-forest-900',
                  'outline-offset-2 focus-visible:outline-2 focus-visible:outline-forest-600',
                )}
              >
                {link.label}
              </a>
            ))}
            <a href="#translator" onClick={closeMenu} className="mt-1">
              <Button variant="primary" className="w-full">
                Get Started
              </Button>
            </a>
          </div>
        </div>
      )}
    </header>
  )
}
