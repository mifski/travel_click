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
      const { error: upsertError } = await upsertProfile({
        id: user.id,
        username: username.replace(/^@/, ''),
        display_name: displayName,
        birthday: birthday || null,
        gender: gender || null,
        avatar_url: avatarUrl,
      })
      if (upsertError) throw upsertError
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
    <div className="scrapbook-bg min-h-dvh flex items-center justify-center">
      <Loader2 className="animate-spin text-[#c94040]" size={28} />
    </div>
  )

  const inp = 'w-full bg-amber-50/60 border border-amber-200 rounded-xl px-4 py-3 text-[#2c1810] text-sm placeholder-amber-700/30 focus:outline-none focus:border-[#c94040]/60 focus:bg-white transition-colors'

  return (
    <div className="scrapbook-bg min-h-dvh">
      <header className="px-6 sm:px-10 py-4 flex items-center gap-4"
        style={{ background: 'rgba(233,223,205,.85)', backdropFilter: 'blur(8px)' }}>
        <Link href="/boards" aria-label="Back to boards" className="transition-colors hover:text-[#2c1810]" style={{ color: 'rgba(44,24,16,.68)' }}>
          <ArrowLeft size={18} />
        </Link>
        <span className="font-display" style={{ fontWeight: 800, fontSize: 19, color: '#2c1810', letterSpacing: '-.02em' }}>
          TravelClick<span style={{ color: '#c94040' }}>.</span>
        </span>
        <span style={{ fontSize: 12, color: 'rgba(44,24,16,.68)' }}>/&nbsp;&nbsp;Profile</span>
      </header>

      <div className="max-w-md mx-auto px-5 py-8">
        {/* Avatar */}
        <div className="flex flex-col items-center mb-8">
          <AvatarUpload preview={avatarPreview} onFile={handleAvatarFile} size={120} />
          <p className="text-[#2c1810] font-bold mt-3 text-lg" style={{ fontFamily: 'var(--font-playfair, Georgia, serif)' }}>
            {profile?.display_name}
          </p>
          <p className="text-[#7a5a40] text-sm">@{profile?.username}</p>
          <p className="text-[#7a5a40] text-xs mt-1">{user.email}</p>
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="p-6 space-y-4"
          style={{ background: '#fffef9', borderRadius: 16, boxShadow: '0 2px 3px rgba(44,24,16,.12), 0 20px 44px -10px rgba(44,24,16,.25)' }}>

          <div>
            <label className="text-xs text-[#6b4a32] mb-1 block font-semibold">Display Name</label>
            <input value={displayName} onChange={e => setDisplayName(e.target.value)} className={inp} />
          </div>

          <div>
            <label className="text-xs text-[#6b4a32] mb-1 block font-semibold">Username</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7a5a40] text-sm">@</span>
              <input value={username} onChange={e => setUsername(e.target.value.replace(/[^a-z0-9_.]/g, ''))}
                className={cn(inp, 'pl-8')} />
            </div>
          </div>

          <div>
            <label className="text-xs text-[#6b4a32] mb-1 block font-semibold">Birthday</label>
            <input type="date" value={birthday} onChange={e => setBirthday(e.target.value)}
              max={new Date().toISOString().split('T')[0]} className={inp} />
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

          <button onClick={handleSave} disabled={saving}
            className="pill-coral pill-lift w-full py-3 rounded-full font-bold transition-all disabled:opacity-60 flex items-center justify-center gap-2">
            {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <Check size={16} /> : <Save size={16} />}
            {saved ? 'Saved!' : saving ? 'Saving…' : 'Save changes'}
          </button>
        </motion.div>

        <button onClick={handleSignOut}
          className="w-full mt-4 py-3 rounded-full text-sm font-semibold transition-colors hover:bg-[#c94040]/5"
          style={{ border: '1px solid rgba(201,64,64,.4)', color: '#a12f2f' }}>
          Sign out
        </button>
      </div>
    </div>
  )
}
