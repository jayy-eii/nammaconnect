import { useEffect, useState } from 'react'
import {
  Menu,
  X,
  Languages,
  Camera,
  WifiOff,
  Users,
  History,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import { Logo } from './Logo'
import { Button } from './ui/Button'
import { cn } from '../lib/cn'

interface NavLinkItem {
  id: string
  label: string
  href: string
  icon?: typeof Languages
}

const NAV_LINKS: NavLinkItem[] = [
  { id: 'home', label: 'Home', href: '#home' },
  { id: 'translator', label: 'Voice & Text', href: '#translator', icon: Languages },
  { id: 'camera-translator', label: 'Scan & Translate', href: '#camera-translator', icon: Camera },
  { id: 'offline-kit', label: 'Offline Kit', href: '#offline-kit', icon: WifiOff },
  { id: 'history', label: 'History', href: '#history', icon: History },
  { id: 'pair-connect', label: 'Pair Connect', href: '#pair-connect', icon: Users },
  { id: 'how-it-works', label: 'How It Works', href: '#how-it-works' },
  { id: 'about', label: 'About', href: '#about' },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<string>('home')

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 12)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Active section observer using IntersectionObserver
  useEffect(() => {
    const sectionIds = NAV_LINKS.map((link) => link.id)
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null)

    if (elements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        })
      },
      {
        rootMargin: '-20% 0px -60% 0px',
        threshold: 0,
      },
    )

    elements.forEach((el) => observer.observe(el))
    return () => {
      elements.forEach((el) => observer.unobserve(el))
    }
  }, [])

  const closeMenu = () => setMenuOpen(false)

  // Close the mobile menu on Escape and lock page scroll while it is open
  useEffect(() => {
    if (!menuOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const handleLinkClick = (id: string) => {
    setActiveSection(id)
    closeMenu()
  }

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-canvas-100/90 shadow-soft border-b border-forest-900/8 backdrop-blur-md'
          : 'bg-transparent',
      )}
    >
      <nav
        aria-label="Main navigation"
        className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8"
      >
        <a
          href="#home"
          onClick={() => handleLinkClick('home')}
          className="rounded-lg outline-offset-4 focus-visible:outline-2 focus-visible:outline-forest-600 transition-transform hover:scale-[1.01]"
        >
          <Logo />
        </a>

        {/* Desktop links */}
        <div className="hidden items-center gap-1 lg:gap-1.5 md:flex">
          {NAV_LINKS.map((link) => {
            const isActive = activeSection === link.id
            const Icon = link.icon

            return (
              <a
                key={link.id}
                href={link.href}
                onClick={() => handleLinkClick(link.id)}
                className={cn(
                  'group relative inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all duration-200',
                  'outline-offset-2 focus-visible:outline-2 focus-visible:outline-forest-600',
                  isActive
                    ? 'bg-forest-100 text-forest-900 font-semibold shadow-xs ring-1 ring-forest-700/15'
                    : 'text-ink-500 hover:bg-forest-900/5 hover:text-forest-900',
                )}
              >
                {Icon && (
                  <Icon
                    className={cn(
                      'h-3.5 w-3.5',
                      isActive ? 'text-forest-700' : 'text-ink-400 group-hover:text-forest-600',
                    )}
                    aria-hidden="true"
                  />
                )}
                <span>{link.label}</span>
                {isActive && (
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-forest-500"
                    aria-hidden="true"
                  />
                )}
              </a>
            )
          })}
          <a
            href="#translator"
            onClick={() => handleLinkClick('translator')}
            className="ml-2"
          >
            <Button variant="primary" size="md" className="h-9 px-4 text-xs font-semibold gap-1.5">
              <span>Try Translator</span>
              <ArrowRight className="h-3.5 w-3.5 opacity-80" />
            </Button>
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
          className="px-5 pb-4 md:hidden animate-fade-up"
        >
          <div className="flex flex-col gap-1 rounded-3xl bg-white p-3.5 shadow-lifted ring-1 ring-forest-900/10">
            {NAV_LINKS.map((link) => {
              const isActive = activeSection === link.id
              const Icon = link.icon

              return (
                <a
                  key={link.id}
                  href={link.href}
                  onClick={() => handleLinkClick(link.id)}
                  className={cn(
                    'flex items-center justify-between rounded-2xl px-4 py-2.5 text-sm transition-colors',
                    'outline-offset-2 focus-visible:outline-2 focus-visible:outline-forest-600',
                    isActive
                      ? 'bg-forest-100 font-semibold text-forest-900 ring-1 ring-forest-700/10'
                      : 'font-medium text-ink-700 hover:bg-forest-50 hover:text-forest-900',
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    {Icon && <Icon className="h-4 w-4 text-forest-600" />}
                    <span>{link.label}</span>
                  </span>
                  {isActive && (
                    <span className="h-2 w-2 rounded-full bg-forest-600" />
                  )}
                </a>
              )
            })}
            <a
              href="#translator"
              onClick={() => handleLinkClick('translator')}
              className="mt-2"
            >
              <Button variant="primary" className="w-full justify-center">
                <Sparkles className="h-4 w-4" />
                <span>Get Started</span>
              </Button>
            </a>
          </div>
        </div>
      )}
    </header>
  )
}
