'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { UserPlus, X, Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { getTripPeople, addTripMember, removeTripMember, type TripPerson } from '@/lib/supabase'
import { toast } from '@/components/UI/Toaster'

const INK = '#2c1810'

/** Share button + panel: add friends by username; everyone on the board edits it live */
export function ShareBoard({ tripId, destination }: { tripId: string; destination: string }) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [people, setPeople] = useState<TripPerson[] | null>(null)
  const [username, setUsername] = useState('')
  const [busy, setBusy] = useState(false)

  const isOwner = people?.some((p) => p.role === 'owner' && p.id === user?.id) ?? false

  async function openPanel() {
    setOpen(true)
    const { people: list, error } = await getTripPeople(tripId)
    if (error) toast.error('Sharing isn’t set up yet: run supabase-collab.sql in Supabase.')
    setPeople(list)
  }

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim() || busy) return
    setBusy(true)
    const { person, error } = await addTripMember(tripId, username)
    setBusy(false)
    if (error || !person) { toast.error(error?.message ?? 'Couldn’t add them'); return }
    setPeople((list) => [...(list ?? []).filter((p) => p.id !== person.id), person])
    setUsername('')
    toast.success(`@${person.username} can now edit ${destination}`)
  }

  async function remove(person: TripPerson) {
    const { error } = await removeTripMember(tripId, person.id)
    if (error) { toast.error('Couldn’t remove them'); return }
    setPeople((list) => (list ?? []).filter((p) => p.id !== person.id))
  }

  if (!user) return null
  return (
    <>
      <button
        onClick={openPanel}
        aria-label="Share this board"
        className="inline-flex items-center gap-1.5 rounded-full font-semibold transition-colors hover:text-[#c94040]"
        style={{ padding: '7px 14px', fontSize: 11.5, color: INK, background: 'rgba(255,254,249,.7)', boxShadow: '0 2px 8px rgba(44,24,16,.12)' }}
      >
        <UserPlus size={13} aria-hidden="true" /> <span className="hidden sm:inline">Share</span>
      </button>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              className="fixed inset-0 z-[200] flex items-center justify-center p-4"
              style={{ background: 'rgba(32,18,9,0.55)', backdropFilter: 'blur(3px)' }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            >
              <motion.div
                role="dialog"
                aria-label={`Share ${destination}`}
                className="w-full max-w-sm"
                style={{ background: '#fffef9', borderRadius: 16, padding: '22px 24px', boxShadow: '0 40px 90px -20px rgba(0,0,0,.6)' }}
                initial={{ scale: 0.94, y: 14 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 14 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display m-0" style={{ fontWeight: 800, fontSize: 22, color: INK }}>Plan {destination} together</h3>
                    <p className="m-0" style={{ fontSize: 12.5, color: 'rgba(44,24,16,.65)', marginTop: 2 }}>
                      Everyone here can add pins, notes and plans. Changes show up live.
                    </p>
                  </div>
                  <button onClick={() => setOpen(false)} aria-label="Close" className="p-1.5 rounded-full hover:bg-black/5">
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={add} className="flex gap-2" style={{ marginTop: 16 }}>
                  <label className="flex-1">
                    <span className="sr-only">Friend&rsquo;s username</span>
                    <input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="@their-username"
                      autoComplete="off"
                      className="w-full focus:outline-none"
                      style={{ padding: '10px 14px', borderRadius: 999, border: '1px solid rgba(44,24,16,.2)', fontSize: 13, color: INK, background: '#fff' }}
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={busy || !username.trim()}
                    className="pill-coral pill-lift rounded-full font-semibold disabled:opacity-60 inline-flex items-center gap-1.5"
                    style={{ padding: '10px 16px', fontSize: 12.5 }}
                  >
                    {busy && <Loader2 size={12} className="animate-spin" />} Add
                  </button>
                </form>
                <p className="m-0" style={{ fontSize: 11, color: 'rgba(44,24,16,.55)', marginTop: 6 }}>
                  They need a TravelClick account. Their username is on their profile page.
                </p>

                <ul className="m-0 p-0 list-none" style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {people === null && <li style={{ fontSize: 12, color: 'rgba(44,24,16,.55)' }}>Loading…</li>}
                  {people?.map((p) => (
                    <li key={p.id} className="flex items-center gap-3">
                      {p.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <span className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold"
                          style={{ background: 'linear-gradient(135deg, #e8a8b8, #c94040)', fontSize: 12 }} aria-hidden="true">
                          {(p.display_name || p.username)[0]?.toUpperCase()}
                        </span>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="m-0 truncate font-semibold" style={{ fontSize: 13, color: INK }}>
                          {p.display_name || p.username}{p.id === user.id ? ' (you)' : ''}
                        </p>
                        <p className="m-0 truncate" style={{ fontSize: 11.5, color: 'rgba(44,24,16,.6)' }}>@{p.username}</p>
                      </div>
                      {p.role === 'owner' ? (
                        <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.1em', color: '#a86030' }}>OWNER</span>
                      ) : isOwner ? (
                        <button onClick={() => remove(p)} className="underline" style={{ fontSize: 11.5, color: 'rgba(44,24,16,.65)' }}>
                          Remove
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}
