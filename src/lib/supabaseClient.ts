import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string

if (!url || !key) {
  throw new Error('Supabase env variables missing')
}

export const supabase = createClient(url, key)

export async function ensureSession() {
  const { data } = await supabase.auth.getSession()
  if (data.session) return data.session
  const { data: signed, error } = await supabase.auth.signInAnonymously()
  if (error) throw error
  return signed.session
}