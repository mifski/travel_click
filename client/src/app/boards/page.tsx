'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, MapPin, Calendar, Users, Loader2,
  Trash2, ChevronRight, BookOpen, User, AlertTriangle, Scale, Plane, Map as MapIcon
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useTripStore } from '@/lib/store'
import { getUserTrips, getTripCards, deleteTrip as dbDeleteTrip, saveTrip, dbTripToTripContext, type DbTrip } from '@/lib/supabase'
import { AgeRangeSelector } from '@/components/TripSetup/AgeRangeSelector'
import { ObjectiveSelector } from '@/components/TripSetup/ObjectiveSelector'
import { BudgetSelector } from '@/components/TripSetup/BudgetSelector'
import { toast } from '@/components/UI/Toaster'
import type { AgeRange, TripObjective, PriceRange } from '@/lib/types'
import { OBJECTIVE_LABELS, PRICE_RANGE_LABELS } from '@/lib/types'
import { formatDate, getDayCount, getTripStatus, cn } from '@/lib/utils'
import { Logo } from '@/components/UI/Logo'

const STAMP_STYLE: Record<'upcoming' | 'ongoing' | 'past', string> = {
  upcoming: 'text-[#c94040]',
  ongoing:  'text-[#6b8f5e]',
  past:     'text-[#7e9ab5]',
}

export default function BoardsPage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const { activeSetup, setSetupField, toggleAgeRange, toggleObjective, setPriceRange, createTrip } = useTripStore()
  const localCards = useTripStore((s) => s.cards)
  const hydrateTrips = useTripStore((s) => s.hydrateTrips)
  const removeTripLocal = useTripStore((s) => s.removeTripLocal)

  const [dbTrips, setDbTrips]       = useState<DbTrip[]>([])
  const [cardCounts, setCardCounts] = useState<Record<string, number>>({})
  const [fetching, setFetching]     = useState(true)
  const [showWizard, setShowWizard] = useState(false)
  const [wizardStep, setWizardStep] = useState(0)
  const [creating, setCreating]     = useState(false)
  const [deleting, setDeleting]     = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<DbTrip | null>(null)

  useEffect(() => { if (!loading && !user) router.replace('/auth/login') }, [loading, user, router])

  const loadTrips = useCallback(async () => {
    if (!user) return
    setFetching(true)
    const { data } = await getUserTrips(user.id)
    const trips = data ?? []
    setDbTrips(trips)

    // Hydrate into local store so boards open on any device
    hydrateTrips(trips.map(dbTripToTripContext))

    // Card counts from Supabase, merged with local pins
    const counts = await Promise.all(trips.map(t => getTripCards(t.id).then(r => [t.id, r.data?.length ?? 0] as const)))
    setCardCounts(Object.fromEntries(counts))
    setFetching(false)
  }, [user, hydrateTrips])

  useEffect(() => { loadTrips() }, [loadTrips])

  async function handleCreateTrip() {
    if (!user || !activeSetup.destination?.trim()) return
    setCreating(true)
    const trip = createTrip()
    // sync to Supabase
    const { error } = await saveTrip({
      id: trip.id,
      user_id: user.id,
      destination: trip.destination,
      country: trip.country,
      start_date: trip.startDate,
      end_date: trip.endDate,
      pax_count: trip.paxCount,
      age_ranges: trip.ageRanges,
      objectives: trip.objectives,
      price_range: trip.priceRange,
      created_at: trip.createdAt,
    })
    if (error) toast.error('Saved locally. Cloud sync failed')
    setCreating(false)
    setShowWizard(false)
    setWizardStep(0)
    router.push(`/board/${trip.id}`)
  }

  async function handleDelete() {
    if (!confirmDelete) return
    setDeleting(true)
    await dbDeleteTrip(confirmDelete.id)
    removeTripLocal(confirmDelete.id)
    setDbTrips(t => t.filter(x => x.id !== confirmDelete.id))
    setDeleting(false)
    setConfirmDelete(null)
    toast.success(`"${confirmDelete.destination}" board deleted`)
  }

  if (loading || !user) return (
    <div className="scrapbook-bg min-h-dvh flex items-center justify-center">
      <Loader2 className="animate-spin text-[#c94040]" size={28} />
    </div>
  )

  const WIZARD_STEPS = ['Where?', 'When?', 'Who?', 'Goals']

  const canNext = wizardStep === 0
    ? !!activeSetup.destination?.trim()
    : wizardStep === 1
    ? !!(activeSetup.startDate && activeSetup.endDate)
    : true

  return (
    <div className="scrapbook-bg min-h-dvh">
      {/* Header */}
      <header className="px-6 sm:px-10 py-4 flex items-center justify-between"
        style={{ background: 'rgba(233,223,205,.85)', backdropFilter: 'blur(8px)' }}>
        <span className="font-display" style={{ fontWeight: 800, fontSize: 19, color: '#2c1810', letterSpacing: '-.02em' }}>
          <Logo fontSize={19} />
        </span>
        <div className="flex items-center gap-3">
          <Link href="/profile" className="flex items-center gap-2 group">
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover border-2 border-amber-200 group-hover:border-amber-400 transition-colors" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-amber-100 border-2 border-amber-200 group-hover:border-amber-400 transition-colors flex items-center justify-center">
                <User size={14} className="text-amber-600" />
              </div>
            )}
            <span className="text-[#6b4a32] text-sm group-hover:text-amber-900 transition-colors hidden sm:block">
              {profile?.display_name ?? 'Profile'}
            </span>
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-5 py-8">
        {/* Greeting */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1.5">
            <span className="uppercase font-semibold" style={{ fontSize: 11, letterSpacing: '.22em', color: '#c94040' }}>
              Your boards
            </span>
            <span style={{ height: 1, width: 48, background: 'rgba(201,64,64,.4)' }} />
          </div>
          <h1 className="font-display text-4xl italic" style={{ fontWeight: 800, color: '#2c1810', letterSpacing: '-.02em' }}>
            {profile?.display_name ? `Welcome back, ${profile.display_name.split(' ')[0]}` : 'Every trip, one scrapbook'}
          </h1>
          <p className="mt-1.5" style={{ color: 'rgba(44,24,16,.68)' }}>Every trip, every memory, all in one place</p>
        </div>

        {/* New trip + decide buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-3 mb-6">
          <button onClick={() => { setShowWizard(true); setWizardStep(0) }}
            className="border-2 border-dashed border-[#c94040]/25 rounded-2xl p-5 flex items-center gap-4 hover:border-[#c94040]/50 hover:bg-[#c94040]/5 transition-all group bg-white/40">
            <div className="w-12 h-12 rounded-full bg-[#c94040]/10 border-2 border-[#c94040]/25 flex items-center justify-center group-hover:bg-[#c94040]/18 transition-colors shrink-0">
              <Plus size={20} className="text-[#c94040]" />
            </div>
            <div className="text-left">
              <p className="text-[#2c1810] font-bold">Plan a new trip</p>
              <p className="text-[#7a5a40] text-sm">Start a scrapbook for your next adventure</p>
            </div>
          </button>
          <Link href="/decide"
            className="border-2 border-dashed border-[#7e9ab5]/35 rounded-2xl p-5 flex items-center gap-4 hover:border-[#7e9ab5]/60 hover:bg-[#7e9ab5]/5 transition-all group bg-white/40">
            <div className="w-12 h-12 rounded-full bg-[#7e9ab5]/10 border-2 border-[#7e9ab5]/30 flex items-center justify-center group-hover:bg-[#7e9ab5]/20 transition-colors shrink-0">
              <Scale size={20} className="text-[#3a5f7a]" />
            </div>
            <div className="text-left">
              <p className="text-[#2c1810] font-bold">Can&rsquo;t decide?</p>
              <p className="text-[#7a5a40] text-sm">Compare destinations</p>
            </div>
          </Link>
        </div>

        {/* Trip list */}
        {fetching ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-[#c94040]" size={24} />
          </div>
        ) : dbTrips.length === 0 ? (
          <div className="text-center py-12 text-[#7a5a40]">
            <MapIcon size={44} strokeWidth={1.5} className="mx-auto mb-4" aria-hidden="true" />
            <p className="font-medium">No boards yet. Start planning!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {dbTrips.map((trip, i) => {
              const days = trip.start_date && trip.end_date ? getDayCount(trip.start_date, trip.end_date) : 0
              const priceLabel = PRICE_RANGE_LABELS[trip.price_range as PriceRange]?.label ?? trip.price_range
              const pinCount = Math.max(cardCounts[trip.id] ?? 0, localCards[trip.id]?.length ?? 0)
              const status = trip.start_date && trip.end_date ? getTripStatus(trip.start_date, trip.end_date) : null
              return (
                <motion.div key={trip.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="group overflow-hidden transition-all hover:-translate-y-1"
                  style={{ background: '#fffef9', boxShadow: '0 2px 3px rgba(44,24,16,.12), 0 16px 36px -8px rgba(44,24,16,.25)' }}>
                  {/* Card top — boarding-pass strip */}
                  <div className="h-2" style={{ background: 'linear-gradient(90deg, #c94040, #c9a84c)' }} />
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <MapPin size={12} className="text-[#c94040]" />
                          <h3 className="font-bold text-[#2c1810]">{trip.destination}</h3>
                        </div>
                        <p className="text-[#7a5a40] text-xs">{trip.country}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {status && (
                          <span className={cn('rubber-stamp', STAMP_STYLE[status.kind])}>
                            {status.label}
                          </span>
                        )}
                        <button onClick={() => setConfirmDelete(trip)}
                          aria-label={`Delete ${trip.destination} board`}
                          className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-100 text-[#7a5a40] hover:text-red-500">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {trip.start_date && (
                        <Chip icon={<Calendar size={10} />} label={`${formatDate(trip.start_date)}${trip.end_date ? ` · ${days}d` : ''}`} />
                      )}
                      <Chip icon={<Users size={10} />} label={`${trip.pax_count} pax`} />
                      <Chip icon={null} label={priceLabel} />
                      {(trip.objectives as TripObjective[]).slice(0, 2).map(obj => {
                        const Icon = OBJECTIVE_LABELS[obj]?.icon
                        return <Chip key={obj} icon={Icon && <Icon size={10} aria-hidden="true" />} label={OBJECTIVE_LABELS[obj]?.label ?? obj} />
                      })}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[#7a5a40] text-xs">{pinCount} pin{pinCount !== 1 ? 's' : ''}</span>
                      <div className="flex gap-2">
                        <Link href={`/board/${trip.id}/itinerary`}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs transition-colors"
                          style={{ border: '1px solid rgba(44,24,16,.18)', color: 'rgba(44,24,16,.68)' }}>
                          <BookOpen size={11} /> Binder
                        </Link>
                        <Link href={`/board/${trip.id}`}
                          className="pill-coral pill-lift flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-semibold">
                          Open board <ChevronRight size={11} />
                        </Link>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setConfirmDelete(null) }}>
            <motion.div initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 16 }}
              role="alertdialog" aria-label="Confirm board deletion"
              className="w-full max-w-sm bg-[#fffef9] border border-amber-200 rounded-3xl p-6 shadow-2xl text-center">
              <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={20} className="text-red-500" />
              </div>
              <h3 className="font-bold text-[#2c1810] text-lg mb-1" style={{ fontFamily: 'var(--font-playfair, Georgia, serif)' }}>
                Delete &ldquo;{confirmDelete.destination}&rdquo;?
              </h3>
              <p className="text-[#6b4a32] text-sm mb-5">
                This removes the board, all its pins, notes, and itinerary. There&rsquo;s no undo.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold border border-amber-200 text-amber-800 hover:bg-amber-50 transition-colors">
                  Keep it
                </button>
                <button onClick={handleDelete} disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                  {deleting && <Loader2 size={13} className="animate-spin" />}
                  Delete board
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trip wizard modal */}
      <AnimatePresence>
        {showWizard && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setShowWizard(false) }}>
            <motion.div initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 16 }}
              className="w-full max-w-md bg-[#fffef9] border border-amber-200 rounded-3xl p-7 shadow-2xl">

              {/* Step indicators */}
              <div className="flex items-center gap-2 mb-6">
                {WIZARD_STEPS.map((s, i) => (
                  <div key={s} className="flex items-center gap-2">
                    <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all',
                      i < wizardStep ? 'text-white' : i === wizardStep ? 'border-2 border-[#c94040] text-[#c94040]' : 'bg-amber-100 text-amber-400')}
                      style={i < wizardStep ? { background: '#c94040' } : {}}>
                      {i + 1}
                    </div>
                    {i < WIZARD_STEPS.length - 1 && <div className={cn('flex-1 h-px w-4', i < wizardStep ? 'bg-[#c94040]' : 'bg-amber-200')} />}
                  </div>
                ))}
                <span className="ml-auto text-[#7a5a40] text-xs font-semibold">{WIZARD_STEPS[wizardStep]}</span>
              </div>

              {wizardStep === 0 && (
                <div className="space-y-3">
                  <label className="text-[#6b4a32] text-sm font-medium">Where are you going?</label>
                  <input autoFocus value={activeSetup.destination ?? ''} onChange={e => setSetupField('destination', e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && canNext && setWizardStep(1)}
                    placeholder="Tokyo, Japan"
                    className="w-full bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5 text-[#2c1810] text-lg placeholder-amber-700/30 focus:outline-none focus:border-[#c94040]/60 focus:bg-white transition-colors" />
                  <input value={activeSetup.country ?? ''} onChange={e => setSetupField('country', e.target.value)}
                    placeholder="Country (optional)"
                    className="w-full bg-amber-50/60 border border-amber-200 rounded-xl px-4 py-2.5 text-[#2c1810] text-sm placeholder-amber-700/30 focus:outline-none focus:border-amber-400 transition-colors" />
                </div>
              )}

              {wizardStep === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-[#6b4a32] mb-1 block font-semibold">From</label>
                      <input type="date" value={activeSetup.startDate ?? ''} onChange={e => setSetupField('startDate', e.target.value)}
                        className="w-full bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-[#2c1810] text-sm focus:outline-none focus:border-[#c94040]/60" />
                    </div>
                    <div>
                      <label className="text-xs text-[#6b4a32] mb-1 block font-semibold">To</label>
                      <input type="date" value={activeSetup.endDate ?? ''} onChange={e => setSetupField('endDate', e.target.value)}
                        min={activeSetup.startDate}
                        className="w-full bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-[#2c1810] text-sm focus:outline-none focus:border-[#c94040]/60" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[#6b4a32] text-sm mb-2 block font-medium">Travellers</label>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setSetupField('paxCount', Math.max(1, (activeSetup.paxCount ?? 2) - 1))}
                        aria-label="Fewer travellers"
                        className="w-9 h-9 rounded-full bg-amber-100 text-amber-800 font-bold hover:bg-amber-200 transition-colors border border-amber-200">−</button>
                      <span className="text-[#2c1810] font-bold text-xl w-6 text-center">{activeSetup.paxCount ?? 2}</span>
                      <button onClick={() => setSetupField('paxCount', (activeSetup.paxCount ?? 2) + 1)}
                        aria-label="More travellers"
                        className="w-9 h-9 rounded-full bg-amber-100 text-amber-800 font-bold hover:bg-amber-200 transition-colors border border-amber-200">+</button>
                    </div>
                  </div>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-[#6b4a32] text-sm mb-3 block font-medium">Age groups</label>
                    <AgeRangeSelector selected={activeSetup.ageRanges ?? ['adults']} onChange={r => toggleAgeRange(r as AgeRange)} />
                  </div>
                  <div>
                    <label className="text-[#6b4a32] text-sm mb-3 block font-medium">Budget</label>
                    <BudgetSelector selected={activeSetup.priceRange ?? 'mid'} onChange={r => setPriceRange(r as PriceRange)} />
                  </div>
                </div>
              )}

              {wizardStep === 3 && (
                <div>
                  <label className="text-[#6b4a32] text-sm mb-3 block font-medium">Trip goals (up to 3)</label>
                  <ObjectiveSelector selected={activeSetup.objectives ?? []} onChange={o => toggleObjective(o as TripObjective)} />
                </div>
              )}

              <div className="flex justify-between mt-6">
                <button onClick={() => wizardStep > 0 ? setWizardStep(s => s - 1) : setShowWizard(false)}
                  className="text-[#7a5a40] hover:text-amber-800 text-sm transition-colors px-2 py-2 font-medium">
                  {wizardStep === 0 ? 'Cancel' : '← Back'}
                </button>
                {wizardStep < WIZARD_STEPS.length - 1 ? (
                  <button onClick={() => canNext && setWizardStep(s => s + 1)} disabled={!canNext}
                    className="pill-coral pill-lift px-6 py-2.5 rounded-full font-bold text-sm disabled:opacity-40">
                    Continue →
                  </button>
                ) : (
                  <button onClick={handleCreateTrip} disabled={creating}
                    className="pill-coral pill-lift px-6 py-2.5 rounded-full font-bold text-sm disabled:opacity-60 flex items-center gap-2">
                    {creating ? <Loader2 size={14} className="animate-spin" /> : <Plane size={14} aria-hidden="true" />}
                    Create board
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Chip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 border border-amber-200 rounded-full text-amber-800 text-[10px] font-medium">
      {icon}{label}
    </span>
  )
}
