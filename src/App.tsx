import { useState } from 'react'
import { Navbar } from './components/Navbar'
import { Hero } from './components/Hero'
import { TranslatorPanel } from './components/TranslatorPanel'
import { CameraTranslator } from './components/CameraTranslator'
import { OfflineSurvivalKit } from './components/OfflineSurvivalKit'
import { ConversationHistory } from './components/ConversationHistory'
import { PairConnect } from './components/PairConnect'
import { HowItWorks } from './components/HowItWorks'
import { SiteFooter } from './components/SiteFooter'
import { type ConversationEntry } from './services/conversationStorage'

export default function App() {
  const [loadedEntry, setLoadedEntry] = useState<ConversationEntry | null>(null)

  const handleLoadEntry = (entry: ConversationEntry) => {
    setLoadedEntry(entry)
    // Smooth scroll up to the translator panel
    document.getElementById('translator')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <TranslatorPanel loadedEntry={loadedEntry} />
        <CameraTranslator />
        <OfflineSurvivalKit />
        <ConversationHistory onLoadEntry={handleLoadEntry} />
        <PairConnect />
        <HowItWorks />
      </main>
      <SiteFooter />
    </div>
  )
}
