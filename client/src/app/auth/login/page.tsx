'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Plane, Eye, EyeOff } from 'lucide-react'
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
      setError(e instanceof Error ? e.message : 'Login failed')
    } finally { setLoading(false) }
  }

  const inp = 'w-full bg-amber-50/60 border border-amber-200 rounded-xl px-4 py-3 text-[#2c1810] text-sm placeholder-amber-700/30 focus:outline-none focus:border-[#c94040]/60 focus:bg-white transition-colors'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: '#f5f0e8' }}>

      <Link href="/" className="flex items-center gap-2 mb-10">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(135deg, #c94040, #e05555)' }}>
          <Plane size={17} className="text-white" />
        </div>
        <span className="font-bold text-[#2c1810] text-lg" style={{ fontFamily: 'var(--font-playfair, Georgia, serif)' }}>TravelClick</span>
      </Link>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm bg-[#fffef9] border border-amber-200 rounded-3xl p-8 shadow-xl">

        <h1 className="text-2xl font-bold text-[#2c1810] mb-1" style={{ fontFamily: 'var(--font-playfair, Georgia, serif)' }}>Welcome back</h1>
        <p className="text-amber-800/50 text-sm mb-7">Sign in to access your boards</p>

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

          <motion.button type="submit" disabled={loading}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="w-full py-3.5 text-white rounded-2xl font-bold transition-all disabled:opacity-60 shadow-lg flex items-center justify-center gap-2 hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #c94040, #e05555)', boxShadow: '0 6px 20px rgba(201,64,64,0.25)' }}>
            {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Sign In
          </motion.button>
        </form>
      </motion.div>

      <p className="text-amber-800/50 text-sm mt-6">
        New here?{' '}
        <Link href="/auth/signup" className="text-[#c94040] hover:text-[#a83030] font-semibold">Create account</Link>
      </p>
    </div>
  )
}
