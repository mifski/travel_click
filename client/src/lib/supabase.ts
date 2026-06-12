import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

export const isSupabaseReady = !!(url && key)

// Lazy singleton — never created at module import time so SSR/build never throws
let _client: SupabaseClient | null = null

function client(): SupabaseClient {
  if (!_client) {
    if (!isSupabaseReady) throw new Error('Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local')
    _client = createClient(url, key)
  }
  return _client
}

// Proxy so callers can write `supabase.from(...)` / `supabase.auth.xxx` without calling client() themselves
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    const c = client()
    const val = (c as unknown as Record<string | symbol, unknown>)[prop]
    return typeof val === 'function' ? (val as (...a: unknown[]) => unknown).bind(c) : val
  },
})

// ─── DB row types ─────────────────────────────────────────────────────────────

export interface DbProfile {
  id: string
  username: string
  display_name: string
  birthday: string | null
  gender: string | null
  avatar_url: string | null
  created_at: string
}

export interface DbTrip {
  id: string
  user_id: string
  destination: string
  country: string
  start_date: string | null
  end_date: string | null
  pax_count: number
  age_ranges: string[]
  objectives: string[]
  price_range: string
  created_at: string
}

export interface DbCard {
  id: string
  trip_id: string
  user_id: string
  source: string
  title: string
  description: string
  location_data: Record<string, unknown>
  image_url: string | null
  thumbnail_url: string | null
  tags: string[]
  confidence: string | null
  source_url: string | null
  creator: string | null
  pin_position: { x: number; y: number; rotation: number }
  saved_at: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export async function uploadAvatar(userId: string, file: File): Promise<string | null> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${userId}/avatar.${ext}`
  const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
  if (error) { console.error('Avatar upload error:', error); return null }
  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return `${data.publicUrl}?t=${Date.now()}`
}

export async function upsertProfile(profile: Omit<DbProfile, 'created_at'>) {
  return supabase.from('profiles').upsert(profile, { onConflict: 'id' }).select().single()
}

export async function getProfile(userId: string) {
  return supabase.from('profiles').select('*').eq('id', userId).single()
}

export async function saveTrip(trip: DbTrip) {
  return supabase.from('trips').upsert(trip, { onConflict: 'id' })
}

export async function getUserTrips(userId: string) {
  return supabase.from('trips').select('*').eq('user_id', userId).order('created_at', { ascending: false })
}

export async function deleteTrip(tripId: string) {
  return supabase.from('trips').delete().eq('id', tripId)
}

export async function saveCard(card: DbCard) {
  return supabase.from('cards').upsert(card, { onConflict: 'id' })
}

export async function getTripCards(tripId: string) {
  return supabase.from('cards').select('*').eq('trip_id', tripId)
}

export async function deleteCard(cardId: string) {
  return supabase.from('cards').delete().eq('id', cardId)
}
