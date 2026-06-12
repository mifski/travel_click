'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  Plane, MapPin, Calendar, Users, DollarSign,
  BookOpen, ArrowLeft, User, StickyNote as StickyNoteIcon,
  Sparkles, Luggage, Stamp, BedDouble, X, Wallet
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useTripStore } from '@/lib/store'
import { Corkboard } from '@/components/Board/Corkboard'
import { LinkExtractor } from '@/components/Board/LinkExtractor'
import { AccommodationCards } from '@/components/Accommodations/AccommodationCards'
import { TravelBrief } from '@/components/Brief/TravelBrief'
import { PackingList } from '@/components/Packing/PackingList'
import { BudgetPlanner } from '@/components/Budget/BudgetPlanner'
import { OBJECTIVE_LABELS, PRICE_RANGE_LABELS } from '@/lib/types'
import { getCategoryFromTags, CATEGORIES } from '@/lib/categories'
import { DEMO_TRIP_ID, seedDemo } from '@/lib/demo-data'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

type ToolTab = 'stays' | 'brief' | 'packing' | 'budget' | null

export default function BoardPage() {
  const { tripId } = useParams() as { tripId: string }
  const router = useRouter()
  const trip = useTripStore((s) => s.trips.find((t) => t.id === tripId) ?? null)
  const cards = useTripStore((s) => s.cards[tripId]) ?? []
  const notes = useTripStore((s) => s.notes[tripId]) ?? []
  const addNote = useTripStore((s) => s.addNote)

  const [activeTool, setActiveTool] = useState<ToolTab>(null)
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [freshNoteId, setFreshNoteId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [demoBanner, setDemoBanner] = useState(true)

  const { profile } = useAuth()
  const isDemo = tripId === DEMO_TRIP_ID

  useEffect(() => { setMounted(true) }, [])

  // Deep-linked /board/demo without seeding? Seed it.
  useEffect(() => {
    if (mounted && !trip && isDemo) { void seedDemo() }
  }, [mounted, trip, isDemo])

  useEffect(() => {
    if (mounted && !trip && !isDemo) router.replace('/boards')
  }, [trip, router, mounted, isDemo])

  if (!mounted || !trip) return null

  const priceLabel = PRICE_RANGE_LABELS[trip.priceRange]?.label ?? trip.priceRange

  // Categories present on this board (for filter chips)
  const presentCategories = Array.from(
    new Map(cards.map((c) => {
      const cat = getCategoryFromTags(c.tags)
      return [cat.key, cat] as const
    })).values()
  )

  function toggleFilter(key: string) {
    setActiveFilters((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }

  function handleAddNote() {
    const note = addNote(tripId)
    setFreshNoteId(note.id)
  }

  const TOOLS: { key: Exclude<ToolTab, null>; icon: React.ReactNode; label: string; color: string }[] = [
    { key: 'stays',   icon: <BedDouble size={13} />, label: 'Stays',   color: '#c94040' },
    { key: 'brief',   icon: <Stamp size={13} />,     label: 'Brief',   color: '#7e9ab5' },
    { key: 'packing', icon: <Luggage size={13} />,   label: 'Packing', color: '#6b8f5e' },
    { key: 'budget',  icon: <Wallet size={13} />,    label: 'Budget',  color: '#c9a84c' },
  ]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f5f0e8' }}>

      {/* ── Demo ribbon ── */}
      {isDemo && demoBanner && (
        <div className="px-4 py-2.5 flex items-center justify-center gap-3 text-sm font-semibold text-white relative"
          style={{ background: 'linear-gradient(90deg, #c98040, #c94040)' }}>
          <Sparkles size={14} />
          <span>You&rsquo;re exploring the demo board — everything works, nothing is saved to an account.</span>
          <Link href="/auth/signup" className="underline underline-offset-2 hover:opacity-80 shrink-0">
            Sign up free
          </Link>
          <button onClick={() => setDemoBanner(false)} aria-label="Dismiss demo banner"
            className="absolute right-3 opacity-70 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Header ── */}
      <header className="bg-white/70 backdrop-blur-md border-b border-amber-200/60 px-4 sm:px-6 py-3.5 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">

          {/* Left: back + trip name */}
          <div className="flex items-center gap-3 min-w-0">
            <Link href={isDemo ? '/' : '/boards'} aria-label="Back" className="text-amber-700/50 hover:text-amber-700 transition-colors shrink-0">
              <ArrowLeft size={18} />
            </Link>
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md shrink-0"
                style={{ background: 'linear-gradient(135deg, #c94040, #e05555)' }}
              >
                <Plane size={16} className="text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-[#2c1810] font-bold text-base leading-tight truncate">
                  {trip.destination}
                </h1>
                <p className="text-amber-700/50 text-xs">{trip.country}</p>
              </div>
            </div>
          </div>

          {/* Centre: meta chips */}
          <div className="hidden md:flex items-center gap-2 flex-wrap">
            <MetaChip icon={<Calendar size={10} />} label={`${formatDate(trip.startDate)} – ${formatDate(trip.endDate)}`} color="blue" />
            <MetaChip icon={<Users size={10} />} label={`${trip.paxCount} traveller${trip.paxCount > 1 ? 's' : ''}`} color="sage" />
            <MetaChip icon={<DollarSign size={10} />} label={priceLabel} color="gold" />
            {trip.objectives.slice(0, 2).map((obj) => (
              <MetaChip key={obj} icon={<span className="text-[10px]">{OBJECTIVE_LABELS[obj]?.icon}</span>} label={OBJECTIVE_LABELS[obj]?.label ?? obj} color="blush" />
            ))}
          </div>

          {/* Right: profile + itinerary button */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-amber-800/30 text-xs hidden sm:block">{cards.length} pins</span>
            {!isDemo && (
              <Link href="/profile" aria-label="Profile" className="hidden sm:flex items-center gap-1.5 group">
                {profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover border-2 border-amber-200 group-hover:border-[#c94040] transition-colors" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-amber-100 border-2 border-amber-200 group-hover:border-amber-400 transition-colors flex items-center justify-center">
                    <User size={12} className="text-amber-600" />
                  </div>
                )}
              </Link>
            )}
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                href={`/board/${tripId}/itinerary`}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-md',
                  cards.length > 0
                    ? 'text-white shadow-red-200'
                    : 'bg-amber-100 text-amber-400 pointer-events-none'
                )}
                style={cards.length > 0 ? { background: 'linear-gradient(135deg, #c94040, #e05555)' } : {}}
              >
                <BookOpen size={14} />
                <span className="hidden sm:block">{isDemo ? 'View Itinerary' : 'Create Itinerary'}</span>
                <span className="sm:hidden">Plan</span>
              </Link>
            </motion.div>
          </div>
        </div>
      </header>

      {/* ── Page body ── */}
      <div className="flex-1 flex flex-col gap-5 p-4 sm:p-6 max-w-7xl mx-auto w-full">

        {/* Link extractor — primary capture action */}
        <LinkExtractor tripId={tripId} />

        {/* Tool tabs */}
        <div>
          <div className="flex items-center gap-2">
            {TOOLS.map((tool) => {
              const active = activeTool === tool.key
              return (
                <button
                  key={tool.key}
                  onClick={() => setActiveTool(active ? null : tool.key)}
                  aria-expanded={active}
                  className={cn(
                    'flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold border-2 transition-all',
                    active ? 'text-white shadow-md' : 'bg-white/70 text-amber-900/60 border-amber-200 hover:text-amber-900'
                  )}
                  style={active ? { background: tool.color, borderColor: tool.color } : {}}
                >
                  {tool.icon}
                  {tool.label}
                </button>
              )
            })}
          </div>

          <AnimatePresence>
            {activeTool && (
              <motion.div
                key={activeTool}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22 }}
                className="overflow-hidden"
              >
                <div className="mt-3">
                  {activeTool === 'stays' && <AccommodationCards trip={trip} />}
                  {activeTool === 'brief' && <TravelBrief trip={trip} />}
                  {activeTool === 'packing' && <PackingList trip={trip} />}
                  {activeTool === 'budget' && <BudgetPlanner trip={trip} />}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Board label + filters + add note */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-amber-900 font-bold text-sm flex items-center gap-2 shrink-0">
            <MapPin size={14} className="text-[#c94040]" />
            Your Board
            {cards.length > 0 && (
              <span className="text-amber-700/40 font-normal text-xs">({cards.length} places)</span>
            )}
          </h2>

          <div className="flex items-center gap-2 flex-wrap">
            {presentCategories.length > 1 && presentCategories.map((cat) => {
              const active = activeFilters.includes(cat.key)
              return (
                <button
                  key={cat.key}
                  onClick={() => toggleFilter(cat.key)}
                  aria-pressed={active}
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all',
                    active ? 'text-white shadow-sm' : 'bg-white/70 text-amber-900/60 border-amber-200 hover:text-amber-900'
                  )}
                  style={active ? { background: cat.color, borderColor: cat.color } : {}}
                >
                  <span>{cat.icon}</span>
                  {cat.label}
                </button>
              )
            })}
            {activeFilters.length > 0 && (
              <button onClick={() => setActiveFilters([])}
                className="text-[11px] text-amber-700/50 hover:text-amber-900 font-semibold underline underline-offset-2">
                Clear
              </button>
            )}
            <button
              onClick={handleAddNote}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border-2 border-dashed border-[#c9a84c]/60 text-[#8a6d20] bg-[#fef3a8]/50 hover:bg-[#fef3a8] transition-colors"
            >
              <StickyNoteIcon size={11} />
              Add note
            </button>
          </div>
        </div>

        {/* Corkboard */}
        <div className="flex-1">
          <Corkboard
            tripId={tripId}
            cards={cards}
            notes={notes}
            activeFilters={activeFilters}
            freshNoteId={freshNoteId}
          />
        </div>

        {/* CTA */}
        {cards.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-4"
          >
            <Link
              href={`/board/${tripId}/itinerary`}
              className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-lg text-white transition-all hover:scale-105 active:scale-100 shadow-xl"
              style={{ background: 'linear-gradient(135deg, #c94040 0%, #e05555 50%, #c94040 100%)', boxShadow: '0 8px 30px rgba(201,64,64,0.35)' }}
            >
              <BookOpen size={20} />
              {isDemo ? 'See the Day-by-Day Itinerary' : 'Generate Day-by-Day Itinerary'}
            </Link>
            <p className="text-amber-700/40 text-xs mt-2">
              {isDemo ? 'Pre-generated for the demo — regenerate it live if you like' : 'AI-powered · Takes ~30 seconds'}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  )
}

/* ── Chip component ── */
type ChipColor = 'blue' | 'sage' | 'gold' | 'blush'

const CHIP_STYLES: Record<ChipColor, string> = {
  blue:  'bg-[#c0d4e8]/60 border-[#7e9ab5]/40 text-[#3a5f7a]',
  sage:  'bg-[#c8dcc0]/60 border-[#6b8f5e]/40 text-[#3a6030]',
  gold:  'bg-amber-100 border-amber-300/60 text-amber-800',
  blush: 'bg-[#f4d0da]/60 border-[#e8a8b8]/50 text-[#8a3050]',
}

function MetaChip({ icon, label, color }: { icon: React.ReactNode; label: string; color: ChipColor }) {
  return (
    <span className={cn('flex items-center gap-1 px-2.5 py-1 border rounded-full text-xs font-semibold', CHIP_STYLES[color])}>
      {icon}
      {label}
    </span>
  )
}
