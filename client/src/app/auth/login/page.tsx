'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      router.push('/boards')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Login failed'
      setError(msg === 'Failed to fetch'
        ? 'Could not reach Supabase — the project may still be waking up. Wait 1–2 min and try again.'
        : msg)
    } finally { setLoading(false) }
  }

  const inp = 'w-full bg-amber-50/60 border border-amber-200 rounded-xl px-4 py-3 text-[#2c1810] text-sm placeholder-amber-700/30 focus:outline-none focus:border-[#c94040]/60 focus:bg-white transition-colors'

  return (
    <div className="scrapbook-bg min-h-screen flex flex-col items-center justify-center px-4">

      <Link href="/" className="font-display mb-10" style={{ fontWeight: 800, fontSize: 20, color: '#2c1810', letterSpacing: '-.02em' }}>
        TravelClick<span style={{ color: '#c94040' }}>.</span>
      </Link>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm p-8"
        style={{ background: '#fffef9', borderRadius: 16, boxShadow: '0 2px 3px rgba(44,24,16,.12), 0 30px 60px -12px rgba(44,24,16,.3)' }}>

        <h1 className="font-display text-2xl mb-1" style={{ fontWeight: 800, color: '#2c1810' }}>Welcome back</h1>
        <p className="text-sm mb-7" style={{ color: 'rgba(44,24,16,.5)' }}>Sign in to access your boards</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs text-amber-800/60 mb-1 block font-semibold">Email</label>
            <input type="email" autoFocus value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" required className={inp} />
          </div>
          <div>
            <label className="text-xs text-amber-800/60 mb-1 block font-semibold">Password</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Your password" required className={`${inp} pr-10`} />
              <button type="button" onClick={() => setShowPw(v => !v)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-700/40 hover:text-amber-700">
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {error && <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <button type="submit" disabled={loading}
            className="pill-coral pill-lift w-full py-3.5 rounded-full font-bold transition-all disabled:opacity-60 flex items-center justify-center gap-2">
            {loading && <span className="tc-spinner w-4 h-4" style={{ border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff' }} />}
            Sign in
          </button>
        </form>
      </motion.div>

      <p className="text-amber-800/50 text-sm mt-6">
        New here?{' '}
        <Link href="/auth/signup" className="text-[#c94040] hover:text-[#a83030] font-semibold">Create account</Link>
      </p>
    </div>
  )
}
