'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { X, BedDouble, Stamp, Luggage, Wallet, Link2, StickyNote, Plane, type LucideIcon } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useTripStore } from '@/lib/store'
import { CollageBoard } from '@/components/Board/CollageBoard'
import { LinkExtractor } from '@/components/Board/LinkExtractor'
import { AccommodationCards } from '@/components/Accommodations/AccommodationCards'
import { TravelBrief } from '@/components/Brief/TravelBrief'
import { PackingList } from '@/components/Packing/PackingList'
import { BudgetPlanner } from '@/components/Budget/BudgetPlanner'
import { GenerationOverlay } from '@/components/UI/GenerationOverlay'
import { toast } from '@/components/UI/Toaster'
import { OBJECTIVE_LABELS } from '@/lib/types'
import { getCategoryFromTags, getChipGroup, CHIP_GROUPS } from '@/lib/categories'
import { DEMO_TRIP_ID, seedDemo } from '@/lib/demo-data'
import { getTripStatus, formatDateRange } from '@/lib/utils'
import type { GeneratedItinerary } from '@/lib/types'
import { Logo } from '@/components/UI/Logo'

type ToolTab = 'stays' | 'brief' | 'packing' | 'budget' | null

const TOOL_TITLES: Record<Exclude<ToolTab, null>, string> = {
  stays: 'Places to stay',
  brief: 'Destination brief',
  packing: 'Packing list',
  budget: 'Trip budget',
}

/* "Food, Culture & Nightlife" from objective keys */
function formatInterests(objectives: string[]): string {
  const short = objectives
    .map((o) => OBJECTIVE_LABELS[o as keyof typeof OBJECTIVE_LABELS]?.label.split(' & ')[0] ?? o)
    .slice(0, 3)
  if (short.length <= 1) return short[0] ?? ''
  return `${short.slice(0, -1).join(', ')} & ${short[short.length - 1]}`
}

export default function BoardPage() {
  const { tripId } = useParams() as { tripId: string }
  const router = useRouter()
  const trip = useTripStore((s) => s.trips.find((t) => t.id === tripId) ?? null)
  const cards = useTripStore((s) => s.cards[tripId]) ?? []
  const notes = useTripStore((s) => s.notes[tripId]) ?? []
  const itinerary = useTripStore((s) => s.itineraries[tripId] ?? null)
  const addNote = useTripStore((s) => s.addNote)
  const saveItinerary = useTripStore((s) => s.saveItinerary)
  const hydrateCards = useTripStore((s) => s.hydrateCards)

  const [activeTool, setActiveTool] = useState<ToolTab>(null)
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [freshNoteId, setFreshNoteId] = useState<string | null>(null)
  const [pinOpen, setPinOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [demoBanner, setDemoBanner] = useState(true)

  const { user, profile } = useAuth()
  const isDemo = tripId === DEMO_TRIP_ID

  useEffect(() => { setMounted(true) }, [])

  // Deep link from the binder nav: /board/id?tool=stays|brief|packing|budget
  useEffect(() => {
    if (!mounted) return
    const tool = new URLSearchParams(window.location.search).get('tool')
    if (tool && ['stays', 'brief', 'packing', 'budget'].includes(tool)) {
      setActiveTool(tool as ToolTab)
    }
  }, [mounted])

  // Pull cloud pins down on open — without this, a board opened on a second
  // device shows the count from /boards but an empty board.
  useEffect(() => {
    if (!mounted || isDemo || !user) return
    let cancelled = false
    ;(async () => {
      try {
        const { isSupabaseReady, getTripCards, dbCardToTravelCard } = await import('@/lib/supabase')
        if (!isSupabaseReady) return
        const { data } = await getTripCards(tripId)
        if (cancelled || !data?.length) return
        hydrateCards(tripId, data.map(dbCardToTravelCard))
      } catch { /* offline — local store stays the source of truth */ }
    })()
    return () => { cancelled = true }
  }, [mounted, isDemo, user, tripId, hydrateCards])

  // Deep-linked /board/demo without seeding? Seed it.
  useEffect(() => {
    if (mounted && !trip && isDemo) { void seedDemo() }
  }, [mounted, trip, isDemo])

  useEffect(() => {
    if (mounted && !trip && !isDemo) router.replace('/boards')
  }, [trip, router, mounted, isDemo])

  if (!mounted || !trip) return null

  const status = getTripStatus(trip.startDate, trip.endDate)
  const dateRange = formatDateRange(trip.startDate, trip.endDate)
  const interests = formatInterests(trip.objectives)
  const ghost = trip.destination === 'Tokyo' ? '東京' : trip.destination
  const ghostSize = ghost.length <= 4 ? 170 : ghost.length <= 8 ? 118 : 88
  const avatarInitial = (profile?.display_name ?? user?.email ?? 'Traveller')[0]?.toUpperCase() ?? 'T'

  const presentGroups = new Set(cards.map((c) => getChipGroup(getCategoryFromTags(c.tags).key)))
  const chips = CHIP_GROUPS.filter((g) => presentGroups.has(g.key))

  function handleAddNote() {
    const note = addNote(tripId)
    setFreshNoteId(note.id)
    toast.info('Sticky added. Drag it anywhere')
  }

  async function goItinerary() {
    if (itinerary) { router.push(`/board/${tripId}/itinerary`); return }
    if (cards.length === 0) { toast.info('Pin a few places first'); return }
    if (generating || !trip) return
    setGenerating(true)

    const savedPlaces = cards.map((c) =>
      [c.location.nameEnglish, c.location.city, c.location.country].filter(Boolean).join(', ')
    )
    try {
      const res = await fetch('/api/itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip, savedPlaces }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to generate itinerary')
      saveItinerary(data.itinerary as GeneratedItinerary)
      toast.success('Your binder is ready ✦')
      router.push(`/board/${tripId}/itinerary`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate itinerary')
    } finally {
      setGenerating(false)
    }
  }

  const toolPills: { key: Exclude<ToolTab, null>; label: string; Icon: LucideIcon }[] = [
    { key: 'stays',   label: 'Stays',   Icon: BedDouble },
    { key: 'brief',   label: 'Brief',   Icon: Stamp },
    { key: 'packing', label: 'Packing', Icon: Luggage },
    { key: 'budget',  label: 'Budget',  Icon: Wallet },
  ]

  return (
    <div className="scrapbook-bg relative min-h-dvh overflow-hidden">

      {/* ── Decorative layers ── */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(126,154,181,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(126,154,181,.1) 1px, transparent 1px)',
          backgroundSize: '120px 120px',
          maskImage: 'radial-gradient(ellipse at 55% 40%, black, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 55% 40%, black, transparent 75%)',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{
          left: '48%', top: '14%', width: 320, height: 320,
          border: '1.5px dashed rgba(201,64,64,.22)', borderRadius: '50%', transform: 'rotate(-8deg)',
        }}
      />

      {/* ── Demo ribbon ── */}
      {isDemo && demoBanner && (
        <div
          className="relative z-10 px-4 py-2 flex items-center justify-center gap-3 text-[12.5px] font-medium"
          style={{ background: '#2c1810', color: '#f2ead8' }}
        >
          <span>You&rsquo;re exploring the demo board. Everything works, nothing is saved to an account.</span>
          <Link href="/auth/signup" className="underline underline-offset-2 hover:opacity-80 shrink-0" style={{ color: '#c9a84c' }}>
            Sign up free
          </Link>
          <button onClick={() => setDemoBanner(false)} aria-label="Dismiss demo banner"
            className="absolute right-3 opacity-60 hover:opacity-100">
            <X size={13} />
          </button>
        </div>
      )}

      <div className="relative mx-auto" style={{ maxWidth: 1280 }}>

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between" style={{ padding: '18px 42px 0' }}>
          <div className="flex items-center gap-5">
            <Link href={isDemo ? '/' : '/boards'} className="font-display" style={{ fontWeight: 800, fontSize: 19, color: '#2c1810', letterSpacing: '-.02em' }}>
              <Logo fontSize={19} />
            </Link>
            <span style={{ fontSize: 12, color: 'rgba(44,24,16,.68)' }}>
              <Link href={isDemo ? '/' : '/boards'} className="hover:text-[#2c1810] transition-colors">Boards</Link>
              &nbsp;&nbsp;/&nbsp;&nbsp;
              <span style={{ color: '#2c1810', fontWeight: 500 }}>{trip.destination}</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1 p-1 rounded-full" style={{ background: 'rgba(255,254,249,.7)', boxShadow: '0 2px 8px rgba(44,24,16,.12)' }}>
              <span className="px-4 py-[7px] rounded-full font-semibold" style={{ background: '#2c1810', color: '#f2ead8', fontSize: 11.5 }}>
                Moodboard
              </span>
              <button
                onClick={goItinerary}
                className="px-4 py-[7px] rounded-full font-semibold transition-colors hover:text-[#c94040]"
                style={{ color: 'rgba(44,24,16,.68)', fontSize: 11.5 }}
              >
                Itinerary ✦
              </button>
            </div>
            <Link href={isDemo ? '/auth/signup' : '/profile'} aria-label="Profile">
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" style={{ boxShadow: '0 2px 8px rgba(201,64,64,.3)' }} />
              ) : (
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold"
                  style={{ background: 'linear-gradient(135deg, #e8a8b8, #c94040)', boxShadow: '0 2px 8px rgba(201,64,64,.3)', fontSize: 12 }}
                >
                  {avatarInitial}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* ── Masthead ── */}
        <div className="relative flex items-end justify-between flex-wrap gap-6" style={{ padding: '24px 42px 0' }}>
          <div className="relative z-[2]">
            <div className="flex items-center gap-3 mb-1.5">
              <span className="uppercase font-semibold" style={{ fontSize: 11, letterSpacing: '.22em', color: '#c94040' }}>
                Trip moodboard
              </span>
              <span style={{ height: 1, width: 48, background: 'rgba(201,64,64,.4)' }} />
              {status.kind === 'upcoming' && (
                <span className="font-hand" style={{ fontSize: 17, color: 'rgba(44,24,16,.68)', transform: 'rotate(-2deg)' }}>
                  {status.label}!
                </span>
              )}
            </div>
            <h1
              className="font-display m-0 italic"
              style={{ fontWeight: 800, fontSize: 76, lineHeight: 0.95, color: '#2c1810', letterSpacing: '-.03em' }}
            >
              {trip.destination}
            </h1>
            <div className="flex flex-wrap items-center" style={{ gap: 18, marginTop: 12, fontSize: 13, color: 'rgba(44,24,16,.68)' }}>
              <span>{dateRange}</span>
              <span style={{ color: 'rgba(44,24,16,.68)' }}>·</span>
              <span>{trip.paxCount} traveller{trip.paxCount > 1 ? 's' : ''}</span>
              {interests && (<><span style={{ color: 'rgba(44,24,16,.68)' }}>·</span><span>{interests}</span></>)}
              <span style={{ color: 'rgba(44,24,16,.68)' }}>·</span>
              <span style={{ color: '#6b8f5e', fontWeight: 600 }}>{cards.length} place{cards.length === 1 ? '' : 's'} pinned</span>
            </div>
          </div>

          <span
            aria-hidden="true"
            className="font-display absolute pointer-events-none select-none whitespace-nowrap"
            style={{ left: '50%', top: -16, transform: 'translateX(-50%)', fontWeight: 900, fontSize: ghostSize, color: 'rgba(44,24,16,.05)', letterSpacing: '.02em' }}
          >
            {ghost}
          </span>

          {/* Boarding pass */}
          <div
            className="relative z-[2] flex"
            style={{ filter: 'drop-shadow(0 14px 24px rgba(44,24,16,.28))', transform: 'rotate(1.5deg)', marginBottom: 6 }}
          >
            <div style={{ background: '#fffef9', borderRadius: '10px 0 0 10px', padding: '16px 22px', borderRight: '2px dashed rgba(44,24,16,.2)' }}>
              <div style={{ fontSize: 9, letterSpacing: '.2em', color: 'rgba(44,24,16,.68)', fontWeight: 700 }}>
                BOARDING · TRAVELCLICK AIR
              </div>
              <div className="flex items-center gap-3" style={{ marginTop: 6 }}>
                <Plane size={16} color="#c94040" aria-hidden="true" />
                <span className="font-display" style={{ fontWeight: 800, fontSize: 26, color: '#2c1810' }}>
                  {trip.destination.toUpperCase()}
                </span>
              </div>
              <div style={{ marginTop: 5, fontSize: 10.5, color: 'rgba(44,24,16,.68)' }}>
                {dateRange} · {trip.paxCount} PAX
              </div>
            </div>
            <div className="flex flex-col justify-center gap-[3px]" style={{ background: '#c94040', borderRadius: '0 10px 10px 0', padding: '16px 16px' }}>
              <span style={{ fontSize: 9, letterSpacing: '.15em', color: 'rgba(255,255,255,.7)', fontWeight: 700 }}>SEAT</span>
              <span className="font-display" style={{ fontWeight: 800, fontSize: 20, color: '#fff' }}>2A</span>
            </div>
          </div>
        </div>

        {/* ── Luggage-tag filters ── */}
        <div className="relative z-[3] flex items-center flex-wrap" style={{ gap: 10, padding: '20px 42px 6px' }}>
          <button
            className="luggage-tag"
            onClick={() => setActiveFilter(null)}
            aria-pressed={!activeFilter}
            style={!activeFilter
              ? { background: '#2c1810', color: '#f2ead8', boxShadow: '0 5px 12px -3px rgba(44,24,16,.45)' }
              : { background: '#fffef9', color: '#2c1810', boxShadow: '0 4px 10px -3px rgba(44,24,16,.25)' }}
          >
            ALL · {cards.length}
          </button>
          {chips.map((chip) => {
            const active = activeFilter === chip.key
            return (
              <button
                key={chip.key}
                className="luggage-tag"
                onClick={() => setActiveFilter(active ? null : chip.key)}
                aria-pressed={active}
                style={active
                  ? { background: '#2c1810', color: '#f2ead8', boxShadow: '0 5px 12px -3px rgba(44,24,16,.45)' }
                  : { background: '#fffef9', color: chip.color, boxShadow: '0 4px 10px -3px rgba(44,24,16,.25)', transform: `rotate(${chip.rotation}deg)` }}
              >
                {chip.label}
              </button>
            )
          })}
          <span className="ml-auto font-hand hidden sm:block" style={{ fontSize: 18, color: 'rgba(44,24,16,.68)', transform: 'rotate(-1deg)' }}>
            drag anything ✏️
          </span>
        </div>

        {/* ── Collage ── */}
        <div className="overflow-x-auto" style={{ padding: '18px 42px 0' }}>
          <CollageBoard
            trip={trip}
            cards={cards}
            notes={notes}
            activeFilter={activeFilter}
            freshNoteId={freshNoteId}
            onOpenPin={() => setPinOpen(true)}
          />
        </div>

        {/* ── Bottom action strip ── */}
        <div
          className="sticky bottom-0 z-40 flex items-center justify-between flex-wrap gap-3"
          style={{ padding: '22px 42px 18px', background: 'linear-gradient(180deg, transparent, rgba(233,223,205,.95) 45%)' }}
        >
          <div className="flex flex-wrap" style={{ gap: 8 }}>
            <button onClick={() => setPinOpen(true)} className="pill-coral pill-lift flex items-center gap-2 rounded-full font-semibold" style={{ padding: '10px 18px', fontSize: 12.5 }}>
              <Link2 size={14} aria-hidden="true" /> Add a place
            </button>
            <button onClick={handleAddNote} className="pill-paper pill-lift flex items-center gap-2 rounded-full" style={{ padding: '10px 16px', fontSize: 12.5 }}>
              <StickyNote size={14} aria-hidden="true" /> Note
            </button>
            {toolPills.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTool(t.key)}
                className="pill-paper pill-lift flex items-center gap-2 rounded-full"
                style={{ padding: '10px 16px', fontSize: 12.5 }}
              >
                <t.Icon size={14} aria-hidden="true" /> {t.label}
              </button>
            ))}
          </div>
          <button
            onClick={goItinerary}
            disabled={generating}
            className="pill-ink pill-lift flex items-center gap-2 font-semibold disabled:opacity-60"
            style={{ padding: '14px 28px', borderRadius: 12, fontSize: 14.5 }}
          >
            {itinerary ? 'Open my binder ✦' : 'Assemble my binder ✦'}
          </button>
        </div>
      </div>

      {/* ── Pin-a-link modal ── */}
      <LinkExtractor tripId={tripId} open={pinOpen} onClose={() => setPinOpen(false)} />

      {/* ── Binder generation overlay ── */}
      <GenerationOverlay show={generating} />

      {/* ── Tool overlay (Stays / Brief / Packing / Budget) ── */}
      <AnimatePresence>
        {activeTool && (
          <motion.div
            className="fixed inset-0 z-[190] flex items-start justify-center overflow-y-auto p-4 sm:p-10"
            style={{ background: 'rgba(32,18,9,.55)', backdropFilter: 'blur(3px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setActiveTool(null)}
          >
            <motion.div
              className="w-full"
              style={{
                maxWidth: 880,
                background: '#fffef9',
                borderRadius: 16,
                padding: '24px 28px 28px',
                boxShadow: '0 40px 90px -20px rgba(0,0,0,.6)',
              }}
              initial={{ y: 18, scale: 0.98 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 18, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 340, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-baseline justify-between mb-4">
                <span className="font-display" style={{ fontWeight: 800, fontSize: 22, color: '#2c1810' }}>
                  {TOOL_TITLES[activeTool]}
                </span>
                <button
                  onClick={() => setActiveTool(null)}
                  aria-label="Close"
                  className="transition-colors hover:text-[#c94040]"
                  style={{ fontSize: 18, color: 'rgba(44,24,16,.68)' }}
                >
                  ×
                </button>
              </div>
              {activeTool === 'stays' && <AccommodationCards trip={trip} />}
              {activeTool === 'brief' && <TravelBrief trip={trip} />}
              {activeTool === 'packing' && <PackingList trip={trip} />}
              {activeTool === 'budget' && <BudgetPlanner trip={trip} />}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
