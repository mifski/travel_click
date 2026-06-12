'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Save, Loader2, Check } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { uploadAvatar, upsertProfile } from '@/lib/supabase'
import { AvatarUpload } from '@/components/Auth/AvatarUpload'
import { toast } from '@/components/UI/Toaster'
import { cn } from '@/lib/utils'

type Gender = 'man' | 'woman' | 'nonbinary' | 'other' | 'prefer_not'
const GENDERS: { value: Gender; label: string }[] = [
  { value: 'man', label: 'Man' },
  { value: 'woman', label: 'Woman' },
  { value: 'nonbinary', label: 'Non-binary' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not', label: 'Prefer not to say' },
]

export default function ProfilePage() {
  const { user, profile, loading, signOut, refreshProfile } = useAuth()
  const router = useRouter()

  const [displayName, setDisplayName] = useState('')
  const [username, setUsername]       = useState('')
  const [birthday, setBirthday]       = useState('')
  const [gender, setGender]           = useState<Gender | ''>('')
  const [avatarFile, setAvatarFile]   = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)

  useEffect(() => {
    if (!loading && !user) router.replace('/auth/login')
  }, [loading, user, router])

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? '')
      setUsername(profile.username ?? '')
      setBirthday(profile.birthday ?? '')
      setGender((profile.gender as Gender) ?? '')
      setAvatarPreview(profile.avatar_url ?? null)
    }
  }, [profile])

  function handleAvatarFile(file: File) {
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleSave() {
    if (!user) return
    setSaving(true); setSaved(false)
    try {
      let avatarUrl = profile?.avatar_url ?? null
      if (avatarFile) {
        avatarUrl = await uploadAvatar(user.id, avatarFile)
      }
      await upsertProfile({
        id: user.id,
        username: username.replace(/^@/, ''),
        display_name: displayName,
        birthday: birthday || null,
        gender: gender || null,
        avatar_url: avatarUrl,
      })
      await refreshProfile()
      setSaved(true)
      toast.success('Profile saved')
      setTimeout(() => setSaved(false), 2500)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    } finally { setSaving(false) }
  }

  async function handleSignOut() {
    await signOut()
    router.push('/')
  }

  if (loading || !user) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f5f0e8' }}>
      <Loader2 className="animate-spin text-[#c94040]" size={28} />
    </div>
  )

  const inp = 'w-full bg-amber-50/60 border border-amber-200 rounded-xl px-4 py-3 text-[#2c1810] text-sm placeholder-amber-700/30 focus:outline-none focus:border-[#c94040]/60 focus:bg-white transition-colors'

  return (
    <div className="min-h-screen" style={{ background: '#f5f0e8' }}>
      <header className="bg-white/70 backdrop-blur-md border-b border-amber-200/60 px-5 py-4 flex items-center gap-3 shadow-sm">
        <Link href="/boards" aria-label="Back to boards" className="text-amber-700/50 hover:text-amber-700 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-[#2c1810] font-bold" style={{ fontFamily: 'var(--font-playfair, Georgia, serif)' }}>Profile</h1>
      </header>

      <div className="max-w-md mx-auto px-5 py-8">
        {/* Avatar */}
        <div className="flex flex-col items-center mb-8">
          <AvatarUpload preview={avatarPreview} onFile={handleAvatarFile} size={120} />
          <p className="text-[#2c1810] font-bold mt-3 text-lg" style={{ fontFamily: 'var(--font-playfair, Georgia, serif)' }}>
            {profile?.display_name}
          </p>
          <p className="text-amber-800/50 text-sm">@{profile?.username}</p>
          <p className="text-amber-800/35 text-xs mt-1">{user.email}</p>
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 border border-amber-200 rounded-2xl p-6 space-y-4 shadow-sm">

          <div>
            <label className="text-xs text-amber-800/60 mb-1 block font-semibold">Display Name</label>
            <input value={displayName} onChange={e => setDisplayName(e.target.value)} className={inp} />
          </div>

          <div>
            <label className="text-xs text-amber-800/60 mb-1 block font-semibold">Username</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-700/40 text-sm">@</span>
              <input value={username} onChange={e => setUsername(e.target.value.replace(/[^a-z0-9_.]/g, ''))}
                className={cn(inp, 'pl-8')} />
            </div>
          </div>

          <div>
            <label className="text-xs text-amber-800/60 mb-1 block font-semibold">Birthday</label>
            <input type="date" value={birthday} onChange={e => setBirthday(e.target.value)}
              max={new Date().toISOString().split('T')[0]} className={inp} />
          </div>

          <div>
            <label className="text-xs text-amber-800/60 mb-2 block font-semibold">Gender</label>
            <div className="grid grid-cols-2 gap-2">
              {GENDERS.map(g => (
                <button key={g.value} type="button" onClick={() => setGender(g.value)}
                  className={cn('px-3 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all text-left',
                    gender === g.value
                      ? 'bg-[#c94040] border-[#c94040] text-white shadow-md'
                      : 'bg-white border-amber-200 text-amber-900/60 hover:border-[#c94040]/40')}>
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleSave} disabled={saving}
            className="w-full py-3 text-white rounded-xl font-bold transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-md hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #c94040, #e05555)' }}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <Check size={16} /> : <Save size={16} />}
            {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Changes'}
          </button>
        </motion.div>

        <button onClick={handleSignOut}
          className="w-full mt-4 py-3 border border-red-300/60 text-red-600 bg-white/60 rounded-xl text-sm font-bold hover:bg-red-50 transition-colors">
          Sign Out
        </button>
      </div>
    </div>
  )
}
