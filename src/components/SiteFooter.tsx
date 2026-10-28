import { Logo } from './Logo'
import { Languages, Camera, WifiOff, History, Users, Heart } from 'lucide-react'

// Computed once at module scope to keep component rendering pure.
const CURRENT_YEAR = new Date().getFullYear()

export function SiteFooter() {
  return (
    <footer id="about" className="scroll-mt-24 border-t border-forest-900/10 bg-canvas-200/40">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr] gap-10 items-start">
          {/* Brand & Mission */}
          <div className="max-w-sm">
            <Logo />
            <p className="mt-3.5 text-sm leading-relaxed text-ink-500">
              NammaConnect bridges linguistic barriers across Karnataka. Speak naturally in English
              or Hindi, scan Kannada signs, and stay connected during internet outages with verified offline survival packs.
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-xs text-ink-400">
              <span>Crafted with</span>
              <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500" />
              <span>for Karnataka · Powered by Gemini AI</span>
            </div>
          </div>

          {/* Quick Features */}
          <div>
            <h4 className="text-xs font-bold tracking-wider uppercase text-forest-900">
              Core Capabilities
            </h4>
            <ul className="mt-3 space-y-2.5 text-xs font-medium text-ink-600">
              <li>
                <a
                  href="#translator"
                  className="inline-flex items-center gap-2 hover:text-forest-900 transition-colors"
                >
                  <Languages className="h-3.5 w-3.5 text-forest-600" />
                  <span>Voice & Text Translation</span>
                </a>
              </li>
              <li>
                <a
                  href="#camera-translator"
                  className="inline-flex items-center gap-2 hover:text-forest-900 transition-colors"
                >
                  <Camera className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Camera Sign Translator</span>
                </a>
              </li>
              <li>
                <a
                  href="#offline-kit"
                  className="inline-flex items-center gap-2 hover:text-forest-900 transition-colors"
                >
                  <WifiOff className="h-3.5 w-3.5 text-amber-600" />
                  <span>Smart Offline Survival Kit</span>
                </a>
              </li>
              <li>
                <a
                  href="#history"
                  className="inline-flex items-center gap-2 hover:text-forest-900 transition-colors"
                >
                  <History className="h-3.5 w-3.5 text-forest-700" />
                  <span>Replay & Correction Trail</span>
                </a>
              </li>
              <li>
                <a
                  href="#pair-connect"
                  className="inline-flex items-center gap-2 hover:text-forest-900 transition-colors"
                >
                  <Users className="h-3.5 w-3.5 text-forest-600" />
                  <span>Pair Connect Mode</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Emergency & Privacy */}
          <div>
            <h4 className="text-xs font-bold tracking-wider uppercase text-forest-900">
              Safety & Privacy
            </h4>
            <p className="mt-3 text-xs leading-relaxed text-ink-500">
              Conversations and offline packs are stored securely in your browser's IndexedDB and Cache API storage.
            </p>
            <div className="mt-3 rounded-xl bg-forest-900/5 p-3 text-[11px] text-forest-900 ring-1 ring-forest-900/10">
              <strong>Emergency Services:</strong> In urgent medical or security emergencies in Karnataka, call <strong>112</strong> or <strong>108</strong>.
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-forest-900/8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-ink-400">
          <p>© {CURRENT_YEAR} NammaConnect. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="#home" className="hover:text-forest-800 transition-colors">
              Back to top ↑
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
