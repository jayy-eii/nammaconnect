import { Navbar } from './components/Navbar'
import { Hero } from './components/Hero'
import { TranslatorPanel } from './components/TranslatorPanel'
import { HowItWorks } from './components/HowItWorks'
import { SiteFooter } from './components/SiteFooter'

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <TranslatorPanel />
        <HowItWorks />
      </main>
      <SiteFooter />
    </div>
  )
}
