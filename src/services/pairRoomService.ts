import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase, ensureSession } from '../lib/supabaseClient'

export type PairLanguage = 'English' | 'Kannada' | 'Hindi'

export interface PairRoom {
  id: string
  code: string
  host_id: string
  peer_id: string | null
  host_language: PairLanguage
  peer_language: PairLanguage | null
  status: 'waiting' | 'active' | 'closed'
  created_at: string
  expires_at?: string
}

export interface PairMessage {
  id: string
  room_id: string
  sender_id: string
  sender_role: 'host' | 'peer'
  original_text: string
  original_language: PairLanguage
  translated_text: string
  target_language: PairLanguage
  transliteration?: string | null
  created_at: string
}

export interface SubscribeCallbacks {
  onRoomUpdate?: (room: PairRoom) => void
  onMessage?: (message: PairMessage) => void
  onPresence?: (presenceKeys: string[]) => void
}

let cachedUserId: string | null = null

export function mapErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err ?? '')
  const lower = msg.toLowerCase()
  if (
    lower.includes('room not available') ||
    lower.includes('not found') ||
    lower.includes('full') ||
    lower.includes('expired')
  ) {
    return 'Room not found, full, or expired. Check the code and try again.'
  }
  if (
    lower.includes('not authenticated') ||
    lower.includes('unauthorized') ||
    lower.includes('jwt')
  ) {
    return 'Session did not start. Refresh and try again.'
  }
  return 'Unable to connect to the room. Please check your network and try again.'
}

export async function getMyUserId(): Promise<string> {
  const session = await ensureSession()
  if (!session?.user?.id) {
    throw new Error('Session did not start. Refresh and try again.')
  }
  cachedUserId = session.user.id
  return session.user.id
}

export async function createRoom(language: PairLanguage): Promise<PairRoom> {
  try {
    await getMyUserId()
    const { data, error } = await supabase.rpc('create_pair_room', {
      p_language: language,
    })

    if (error) {
      throw new Error(mapErrorMessage(error))
    }

    const room = (Array.isArray(data) ? data[0] : data) as PairRoom
    if (!room) {
      throw new Error(mapErrorMessage('room not available'))
    }
    return room
  } catch (err) {
    if (err instanceof Error) {
      throw err
    }
    throw new Error(mapErrorMessage(err))
  }
}

export async function joinRoom(code: string, language: PairLanguage): Promise<PairRoom> {
  try {
    await getMyUserId()
    const cleanCode = code.trim().toUpperCase()
    const { data, error } = await supabase.rpc('join_pair_room', {
      p_code: cleanCode,
      p_language: language,
    })

    if (error) {
      throw new Error(mapErrorMessage(error))
    }

    const room = (Array.isArray(data) ? data[0] : data) as PairRoom
    if (!room) {
      throw new Error(mapErrorMessage('room not available'))
    }
    return room
  } catch (err) {
    if (err instanceof Error) {
      throw err
    }
    throw new Error(mapErrorMessage(err))
  }
}

export async function closeRoom(roomId: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('close_pair_room', {
      p_room_id: roomId,
    })
    if (error) {
      throw new Error(mapErrorMessage(error))
    }
  } catch (err) {
    if (err instanceof Error) {
      throw err
    }
    throw new Error(mapErrorMessage(err))
  }
}

export async function loadMessages(roomId: string): Promise<PairMessage[]> {
  try {
    const { data, error } = await supabase
      .from('pair_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })

    if (error) {
      throw new Error(mapErrorMessage(error))
    }
    return (data as PairMessage[]) || []
  } catch (err) {
    if (err instanceof Error) {
      throw err
    }
    throw new Error(mapErrorMessage(err))
  }
}

export function subscribeToRoom(
  roomId: string,
  callbacks: SubscribeCallbacks,
): RealtimeChannel {
  const presenceKey =
    cachedUserId || `user-${Math.random().toString(36).substring(2, 9)}`

  const channel = supabase.channel(`pair:${roomId}`, {
    config: {
      presence: { key: presenceKey },
    },
  })

  channel
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'pair_rooms',
        filter: `id=eq.${roomId}`,
      },
      (payload) => {
        if (payload.new) {
          callbacks.onRoomUpdate?.(payload.new as PairRoom)
        }
      },
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'pair_messages',
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => {
        if (payload.new) {
          callbacks.onMessage?.(payload.new as PairMessage)
        }
      },
    )
    .on('presence', { event: 'sync' }, () => {
      callbacks.onPresence?.(Object.keys(channel.presenceState()))
    })
    .on('presence', { event: 'join' }, () => {
      callbacks.onPresence?.(Object.keys(channel.presenceState()))
    })
    .on('presence', { event: 'leave' }, () => {
      callbacks.onPresence?.(Object.keys(channel.presenceState()))
    })

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      void channel.track({ online_at: new Date().toISOString() })
    }
  })

  return channel
}

export function leaveRoom(channel: RealtimeChannel) {
  return supabase.removeChannel(channel)
}
