'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, ChevronRight, ChevronLeft, Check, MailCheck } from 'lucide-react'
import { supabase, upsertProfile, uploadAvatar } from '@/lib/supabase'
import { OTPInput } from '@/components/Auth/OTPInput'
import { AvatarUpload } from '@/components/Auth/AvatarUpload'
import { cn } from '@/lib/utils'

type Gender = 'man' | 'woman' | 'nonbinary' | 'other' | 'prefer_not'

const GENDERS: { value: Gender; label: string }[] = [
  { value: 'man', label: 'Man' },
  { value: 'woman', label: 'Woman' },
  { value: 'nonbinary', label: 'Non-binary' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not', label: 'Prefer not to say' },
]

const STEPS = ['Identity', 'Personal', 'Account', 'Verify', 'Photo']

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPw, setShowPw] = useState(false)

  // Form state
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername]       = useState('')
  const [birthday, setBirthday]       = useState('')
  const [gender, setGender]           = useState<Gender | ''>('')
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [confirmPw, setConfirmPw]     = useState('')
  const [otp, setOtp]                 = useState('')
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [avatarFile, setAvatarFile]   = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  function go(next: number) {
    setDirection(next > step ? 1 : -1)
    setStep(next)
    setError('')
  }

  function handleAvatarFile(file: File) {
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  function saveProfile(userId: string) {
    return upsertProfile({
      id: userId,
      username: username.replace(/^@/, ''),
      display_name: displayName,
      birthday: birthday || null,
      gender: gender || null,
      avatar_url: null,
    })
  }

  async function handleSignup() {
    if (password !== confirmPw) { setError('Passwords do not match'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true); setError('')
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName, username } },
      })
      if (error) throw error
      // Supabase fakes success for an existing email (no identities, no email sent)
      if (data.user && data.user.identities?.length === 0) {
        setError('This email already has an account. Sign in, or use Forgot password on the sign-in page.')
        return
      }
      // Email confirmation is off in Supabase: already signed in, no code coming
      if (data.session && data.user) {
        await saveProfile(data.user.id)
        go(4)
        return
      }
      go(3) // OTP step
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Signup failed'
      setError(msg === 'Failed to fetch'
        ? 'Could not reach Supabase. The project may still be waking up. Wait 1-2 min and try again.'
        : msg)
    } finally { setLoading(false) }
  }

  async function handleVerify() {
    if (otp.length < 6) { setError('Enter the 6-digit code'); return }
    setLoading(true); setError('')
    try {
      const { data, error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'signup' })
      if (error) throw error
      const userId = data.user?.id
      if (!userId) throw new Error('No user ID returned')

      await saveProfile(userId)
      go(4) // Photo step
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Verification failed')
    } finally { setLoading(false) }
  }

  async function handleFinish() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user && avatarFile) {
        const url = await uploadAvatar(user.id, avatarFile)
        if (url) await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id)
      }
      router.push('/boards')
    } catch { /* non-fatal */ router.push('/boards') }
    finally { setLoading(false) }
  }

  const slide = {
    enter: (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -60 : 60, opacity: 0 }),
  }

  return (
    <div className="scrapbook-bg min-h-dvh flex flex-col items-center justify-center px-4 py-10">

      {/* Logo */}
      <Link href="/" className="font-display mb-8" style={{ fontWeight: 800, fontSize: 20, color: '#2c1810', letterSpacing: '-.02em' }}>
        TravelClick<span style={{ color: '#c94040' }}>.</span>
      </Link>

      {/* Step bar */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
              i < step ? 'text-white' : i === step ? 'border-2 border-[#c94040] text-[#c94040] bg-white' : 'bg-amber-100 text-amber-400'
            )}
              style={i < step ? { background: '#c94040' } : {}}>
              {i < step ? <Check size={13} /> : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn('w-6 h-px', i < step ? 'bg-[#c94040]' : 'bg-amber-200')} />
            )}
          </div>
        ))}
      </div>

      {/* Card */}
      <div className="w-full max-w-sm p-8 overflow-hidden relative min-h-[340px]"
        style={{ background: '#fffef9', borderRadius: 16, boxShadow: '0 2px 3px rgba(44,24,16,.12), 0 30px 60px -12px rgba(44,24,16,.3)' }}>
        <AnimatePresence custom={direction} mode="wait">
          <motion.div key={step} custom={direction} variants={slide}
            initial="enter" animate="center" exit="exit"
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}>

            {/* Step 0 — Identity */}
            {step === 0 && (
              <div>
                <h2 className="text-xl font-bold text-[#2c1810] mb-1" style={{ fontFamily: 'var(--font-playfair, Georgia, serif)' }}>Who are you?</h2>
                <p className="text-[#7a5a40] text-sm mb-6">Your public travel identity</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-[#6b4a32] mb-1 block font-semibold">Display Name</label>
                    <input autoFocus value={displayName} onChange={e => setDisplayName(e.target.value)}
                      placeholder="Your name" className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs text-[#6b4a32] mb-1 block font-semibold">Username</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7a5a40] text-sm">@</span>
                      <input value={username} onChange={e => setUsername(e.target.value.replace(/[^a-z0-9_.]/g, ''))}
                        placeholder="your_username" className={cn(inputCls, 'pl-8')} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 1 — Personal */}
            {step === 1 && (
              <div>
                <h2 className="text-xl font-bold text-[#2c1810] mb-1" style={{ fontFamily: 'var(--font-playfair, Georgia, serif)' }}>A bit about you</h2>
                <p className="text-[#7a5a40] text-sm mb-6">Personalises your experience</p>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-[#6b4a32] mb-1 block font-semibold">Birthday</label>
                    <input type="date" value={birthday} onChange={e => setBirthday(e.target.value)}
                      max={new Date().toISOString().split('T')[0]} className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs text-[#6b4a32] mb-2 block font-semibold">Gender</label>
                    <div className="grid grid-cols-2 gap-2">
                      {GENDERS.map(g => (
                        <button key={g.value} type="button" onClick={() => setGender(g.value)}
                          className={cn('px-3 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all text-left',
                            gender === g.value
                              ? 'bg-[#c94040] border-[#c94040] text-white shadow-md'
                              : 'bg-white border-amber-200 text-[#6b4a32] hover:border-[#c94040]/40')}>
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2 — Account */}
            {step === 2 && (
              <div>
                <h2 className="text-xl font-bold text-[#2c1810] mb-1" style={{ fontFamily: 'var(--font-playfair, Georgia, serif)' }}>Create your account</h2>
                <p className="text-[#7a5a40] text-sm mb-6">We&apos;ll send a code to verify your email</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-[#6b4a32] mb-1 block font-semibold">Email</label>
                    <input type="email" autoFocus value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com" className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs text-[#6b4a32] mb-1 block font-semibold">Password</label>
                    <div className="relative">
                      <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                        placeholder="Min 8 characters" className={cn(inputCls, 'pr-10')} />
                      <button type="button" onClick={() => setShowPw(v => !v)}
                        aria-label={showPw ? 'Hide password' : 'Show password'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7a5a40] hover:text-amber-700">
                        {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-[#6b4a32] mb-1 block font-semibold">Confirm Password</label>
                    <input type={showPw ? 'text' : 'password'} value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                      placeholder="Repeat password" className={inputCls} />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3 — OTP */}
            {step === 3 && (
              <div className="text-center">
                <MailCheck size={44} strokeWidth={1.5} className="mx-auto mb-4 text-[#c94040]" aria-hidden="true" />
                <h2 className="text-xl font-bold text-[#2c1810] mb-1" style={{ fontFamily: 'var(--font-playfair, Georgia, serif)' }}>Check your email</h2>
                <p className="text-[#7a5a40] text-sm mb-6">
                  We sent a 6-digit code to<br />
                  <span className="text-[#c94040] font-semibold">{email}</span>
                </p>
                <OTPInput value={otp} onChange={setOtp} />
                <button
                  disabled={resendStatus !== 'idle'}
                  onClick={async () => {
                    setResendStatus('sending')
                    const { error } = await supabase.auth.resend({ type: 'signup', email })
                    if (error) { setError(error.message); setResendStatus('idle') }
                    else { setResendStatus('sent'); setTimeout(() => setResendStatus('idle'), 30000) }
                  }}
                  className="text-xs text-[#7a5a40] hover:text-[#c94040] disabled:opacity-50 transition-colors mt-4 block mx-auto">
                  {resendStatus === 'sending' ? 'Sending…' : resendStatus === 'sent' ? 'Code sent!' : 'Resend code'}
                </button>
              </div>
            )}

            {/* Step 4 — Photo */}
            {step === 4 && (
              <div className="text-center">
                <h2 className="text-xl font-bold text-[#2c1810] mb-1" style={{ fontFamily: 'var(--font-playfair, Georgia, serif)' }}>Add a profile photo</h2>
                <p className="text-[#7a5a40] text-sm mb-6">Optional. You can always change it later</p>
                <div className="flex justify-center mb-4">
                  <AvatarUpload preview={avatarPreview} onFile={handleAvatarFile} size={120} />
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {error && (
          <p className="text-red-600 text-xs text-center mt-4">{error}</p>
        )}
      </div>

      {/* Nav buttons */}
      <div className="flex justify-between items-center w-full max-w-sm mt-4">
        <button onClick={() => step > 0 && step !== 3 && go(step - 1)}
          className={cn('flex items-center gap-1 text-[#7a5a40] hover:text-amber-900 text-sm transition-colors px-2 py-2 font-medium',
            (step === 0 || step === 3) && 'invisible')}>
          <ChevronLeft size={15} /> Back
        </button>

        {step === 0 && (
          <NavBtn onClick={() => { if (!displayName.trim() || !username.trim()) { setError('Fill in both fields'); return } setError(''); go(1) }} label="Continue" />
        )}
        {step === 1 && (
          <NavBtn onClick={() => go(2)} label="Continue" />
        )}
        {step === 2 && (
          <NavBtn onClick={handleSignup} label="Send code" loading={loading} />
        )}
        {step === 3 && (
          <NavBtn onClick={handleVerify} label="Verify" loading={loading} />
        )}
        {step === 4 && (
          <NavBtn onClick={handleFinish} label={avatarFile ? 'Save & Start' : 'Skip'} loading={loading} />
        )}
      </div>

      <p className="text-[#7a5a40] text-sm mt-6">
        Already have an account?{' '}
        <Link href="/auth/login" className="text-[#c94040] hover:text-[#a83030] font-semibold">Sign in</Link>
      </p>
    </div>
  )
}

const inputCls = 'w-full bg-amber-50/60 border border-amber-200 rounded-xl px-4 py-3 text-[#2c1810] text-sm placeholder-amber-700/30 focus:outline-none focus:border-[#c94040]/60 focus:bg-white transition-colors'

function NavBtn({ onClick, label, loading }: { onClick: () => void; label: string; loading?: boolean }) {
  return (
    <button onClick={onClick} disabled={loading}
      className="pill-coral pill-lift flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm disabled:opacity-60">
      {loading ? <span className="tc-spinner w-4 h-4" style={{ border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> : null}
      {label}
      {!loading && <ChevronRight size={15} />}
    </button>
  )
}
