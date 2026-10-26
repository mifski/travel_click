'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { isSupabaseReady, getProfile, upsertProfile, type DbProfile } from './supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: DbProfile | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null, session: null, profile: null, loading: true,
  signOut: async () => {}, refreshProfile: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<DbProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (u: User) => {
    const { data } = await getProfile(u.id)
    if (data) { setProfile(data); return }
    // Accounts confirmed outside the OTP step never got a profile row; build it from signup metadata
    const meta = u.user_metadata ?? {}
    const { data: created } = await upsertProfile({
      id: u.id,
      username: String(meta.username ?? u.email?.split('@')[0] ?? '').replace(/^@/, ''),
      display_name: String(meta.display_name ?? meta.username ?? u.email?.split('@')[0] ?? ''),
      birthday: null,
      gender: null,
      avatar_url: null,
    })
    setProfile(created ?? null)
  }, [])

  useEffect(() => {
    if (!isSupabaseReady) { setLoading(false); return }
    let unsubscribe: (() => void) | undefined
    let cancelled = false

    // Dynamic import so supabase client is never instantiated during SSR
    import('./supabase').then(({ supabase }) => {
      if (cancelled) return
      // onAuthStateChange fires INITIAL_SESSION on subscribe, so no separate getSession call is needed
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
        if (session?.user) void fetchProfile(session.user)
        else setProfile(null)
      })
      unsubscribe = () => subscription.unsubscribe()
    })

    return () => { cancelled = true; unsubscribe?.() }
  }, [fetchProfile])

  async function signOut() {
    const { supabase } = await import('./supabase')
    await supabase.auth.signOut()
    setUser(null); setSession(null); setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut, refreshProfile: async () => { if (user) await fetchProfile(user) } }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
