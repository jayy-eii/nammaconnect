import { useState, useEffect } from 'react'
import { Users } from 'lucide-react'
import { PairConnectLanding } from './PairConnectLanding'
import { PairConnectCreateRoom } from './PairConnectCreateRoom'
import { PairConnectJoinRoom } from './PairConnectJoinRoom'
import { PairConnectConversation } from './PairConnectConversation'
import { type PairRoom, type PairLanguage } from '../services/pairRoomService'

type PairView = 'landing' | 'create' | 'join' | 'conversation'

export function PairConnect() {
  const [view, setView] = useState<PairView>('landing')
  const [room, setRoom] = useState<PairRoom | null>(null)
  const [myRole, setMyRole] = useState<'host' | 'peer'>('host')
  const [myLanguage, setMyLanguage] = useState<PairLanguage>('English')
  const [peerLanguage, setPeerLanguage] = useState<PairLanguage>('Kannada')
  const [deepLinkCode, setDeepLinkCode] = useState<string>('')

  // Detect #pair-connect?join=CODE or ?join=CODE deep link
  useEffect(() => {
    const checkDeepLink = () => {
      const hash = window.location.hash
      const search = window.location.search
      let code = ''

      if (hash.includes('join=')) {
        const match = hash.match(/join=([A-Za-z0-9-]+)/)
        if (match) code = match[1]
      } else if (search.includes('join=')) {
        const params = new URLSearchParams(search)
        code = params.get('join') || ''
      }

      if (code) {
        setDeepLinkCode(code)
        setView('join')
        const el = document.getElementById('pair-connect')
        el?.scrollIntoView({ behavior: 'smooth' })
      }
    }

    checkDeepLink()
    window.addEventListener('hashchange', checkDeepLink)
    return () => window.removeEventListener('hashchange', checkDeepLink)
  }, [])

  const handleRoomCreated = (createdRoom: PairRoom) => {
    setRoom(createdRoom)
    setMyRole('host')
    if (createdRoom.peer_language) {
      setPeerLanguage(createdRoom.peer_language)
    } else {
      setPeerLanguage(myLanguage === 'English' ? 'Kannada' : 'English')
    }
  }

  const handleRoomActive = (activeRoom: PairRoom) => {
    setRoom(activeRoom)
    setMyRole('host')
    if (activeRoom.peer_language) {
      setPeerLanguage(activeRoom.peer_language)
    }
    setView('conversation')
  }

  const handleRoomJoined = (joinedRoom: PairRoom) => {
    setRoom(joinedRoom)
    setMyRole('peer')
    setPeerLanguage(joinedRoom.host_language)
    setView('conversation')
  }

  const handleEndSession = () => {
    setRoom(null)
    setDeepLinkCode('')
    setView('landing')
  }

  return (
    <section id="pair-connect" className="scroll-mt-24 py-12 sm:py-16">
      <div className="mx-auto max-w-4xl px-5 sm:px-8">
        {/* Section eyebrow */}
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-forest-900/5 px-3.5 py-1.5 text-[13px] font-semibold tracking-[0.14em] text-forest-700 uppercase ring-1 ring-forest-900/10">
            <Users className="h-4 w-4 text-forest-600" aria-hidden="true" />
            <span>Pair Connect Mode</span>
          </span>
          {view === 'landing' && (
            <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-ink-500">
              Connect two devices in a private room for real-time bilingual conversation.
              Speak or type in your language, and your partner reads and hears it in theirs.
            </p>
          )}
        </div>

        <div className="mt-8">
          {view === 'landing' && (
            <PairConnectLanding
              onCreateRoom={() => setView('create')}
              onJoinRoom={() => {
                setDeepLinkCode('')
                setView('join')
              }}
            />
          )}

          {view === 'create' && (
            <PairConnectCreateRoom
              myLanguage={myLanguage}
              onMyLanguageChange={setMyLanguage}
              onRoomCreated={handleRoomCreated}
              onRoomActive={handleRoomActive}
              onBack={() => setView('join')}
              onBackHome={() => setView('landing')}
            />
          )}

          {view === 'join' && (
            <PairConnectJoinRoom
              initialCode={deepLinkCode}
              myLanguage={myLanguage}
              onMyLanguageChange={setMyLanguage}
              onRoomJoined={handleRoomJoined}
              onBack={() => setView('create')}
              onBackHome={() => setView('landing')}
            />
          )}

          {view === 'conversation' && room && (
            <PairConnectConversation
              room={room}
              myRole={myRole}
              myLanguage={myLanguage}
              peerLanguage={peerLanguage}
              onEndSession={handleEndSession}
            />
          )}
        </div>
      </div>
    </section>
  )
}
