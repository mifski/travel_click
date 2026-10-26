'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Eye, EyeOff, MailCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Logo } from '@/components/UI/Logo'

/** Two modes on one page: request a reset email, or (arriving from that email) set a new password */
export default function ResetPasswordPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'request' | 'sent' | 'update'>('request')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Child effects run before AuthProvider creates the client, so the recovery hash is still in the URL here
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (window.location.hash.includes('type=recovery')) setMode('update')
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setMode('update')
    })
    return () => subscription.unsubscribe()
  }, [])

  async function requestReset(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    })
    setLoading(false)
    if (error) setError(error.message === 'Failed to fetch' ? 'Could not reach Supabase. Wait 1-2 min and try again.' : error.message)
    else setMode('sent')
  }

  async function updatePassword(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmPw) { setError('Passwords do not match'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) setError(error.message)
    else router.push('/boards')
  }

  const inp = 'w-full bg-amber-50/60 border border-amber-200 rounded-xl px-4 py-3 text-[#2c1810] text-sm placeholder-amber-700/30 focus:outline-none focus:border-[#c94040]/60 focus:bg-white transition-colors'
  const errorBox = error && <p role="alert" className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
  const submit = (label: string) => (
    <button type="submit" disabled={loading}
      className="pill-coral pill-lift w-full py-3.5 rounded-full font-bold transition-all disabled:opacity-60 flex items-center justify-center gap-2">
      {loading && <span className="tc-spinner w-4 h-4" style={{ border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff' }} />}
      {label}
    </button>
  )

  return (
    <div className="scrapbook-bg min-h-dvh flex flex-col items-center justify-center px-4">
      <Link href="/" className="font-display mb-10" style={{ fontWeight: 800, fontSize: 20, color: '#2c1810', letterSpacing: '-.02em' }}>
        <Logo fontSize={20} />
      </Link>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm p-8"
        style={{ background: '#fffef9', borderRadius: 16, boxShadow: '0 2px 3px rgba(44,24,16,.12), 0 30px 60px -12px rgba(44,24,16,.3)' }}>

        {mode === 'request' && (
          <>
            <h1 className="font-display text-2xl mb-1" style={{ fontWeight: 800, color: '#2c1810' }}>Reset your password</h1>
            <p className="text-sm mb-7" style={{ color: 'rgba(44,24,16,.68)' }}>We&rsquo;ll email you a link to set a new one</p>
            <form onSubmit={requestReset} className="space-y-4">
              <div>
                <label htmlFor="reset-email" className="text-xs text-[#6b4a32] mb-1 block font-semibold">Email</label>
                <input id="reset-email" type="email" autoFocus value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" required className={inp} />
              </div>
              {errorBox}
              {submit('Send reset link')}
            </form>
          </>
        )}

        {mode === 'sent' && (
          <div className="text-center">
            <MailCheck size={44} strokeWidth={1.5} className="mx-auto mb-4 text-[#c94040]" aria-hidden="true" />
            <h1 className="font-display text-2xl mb-1" style={{ fontWeight: 800, color: '#2c1810' }}>Check your email</h1>
            <p className="text-sm" style={{ color: 'rgba(44,24,16,.68)' }}>
              If <span className="text-[#c94040] font-semibold">{email}</span> has an account, a reset link is on its way. Check spam too.
            </p>
          </div>
        )}

        {mode === 'update' && (
          <>
            <h1 className="font-display text-2xl mb-1" style={{ fontWeight: 800, color: '#2c1810' }}>Choose a new password</h1>
            <p className="text-sm mb-7" style={{ color: 'rgba(44,24,16,.68)' }}>At least 8 characters</p>
            <form onSubmit={updatePassword} className="space-y-4">
              <div>
                <label htmlFor="new-pw" className="text-xs text-[#6b4a32] mb-1 block font-semibold">New password</label>
                <div className="relative">
                  <input id="new-pw" type={showPw ? 'text' : 'password'} autoFocus value={password} onChange={e => setPassword(e.target.value)}
                    autoComplete="new-password" required className={`${inp} pr-10`} />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7a5a40] hover:text-amber-700">
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="confirm-pw" className="text-xs text-[#6b4a32] mb-1 block font-semibold">Confirm password</label>
                <input id="confirm-pw" type={showPw ? 'text' : 'password'} value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                  autoComplete="new-password" required className={inp} />
              </div>
              {errorBox}
              {submit('Save password')}
            </form>
          </>
        )}
      </motion.div>

      <p className="text-[#7a5a40] text-sm mt-6">
        Remembered it?{' '}
        <Link href="/auth/login" className="text-[#c94040] hover:text-[#a83030] font-semibold">Sign in</Link>
      </p>
    </div>
  )
}
