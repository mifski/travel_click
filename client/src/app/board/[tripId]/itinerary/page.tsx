'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Sparkles, RefreshCw, AlertTriangle, Printer, Wand2, Loader2 } from 'lucide-react'
import { useTripStore } from '@/lib/store'
import { ItineraryBinder, DayPage, DAY_COLORS } from '@/components/Itinerary/ItineraryBinder'
import { DEMO_TRIP_ID, seedDemo } from '@/lib/demo-data'
import type { GeneratedItinerary } from '@/lib/types'
import { getDayCount } from '@/lib/utils'

const LOADING_STEPS = [
  'Reading your pinned places…',
  'Grouping spots by neighbourhood…',
  'Balancing the daily pace…',
  'Timing meals around activities…',
  'Adding local tips & costs…',
  'Polishing the final plan…',
]

export default function ItineraryPage() {
  const { tripId } = useParams() as { tripId: string }
  const router = useRouter()
  const trip = useTripStore((s) => s.trips.find((t) => t.id === tripId) ?? null)
  const cards = useTripStore((s) => s.cards[tripId]) ?? []
  const storedItinerary = useTripStore((s) => s.itineraries[tripId] ?? null)
  const saveItinerary = useTripStore((s) => s.saveItinerary)

  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showRefine, setShowRefine] = useState(false)
  const [instructions, setInstructions] = useState('')
  const [loadingStep, setLoadingStep] = useState(0)

  const isDemo = tripId === DEMO_TRIP_ID
  const itinerary: GeneratedItinerary | null = storedItinerary

  useEffect(() => { setMounted(true) }, [])

  // Deep-linked demo without seed
  useEffect(() => {
    if (mounted && !trip && isDemo) { void seedDemo() }
  }, [mounted, trip, isDemo])

  useEffect(() => {
    if (!mounted) return
    if (!trip && !isDemo) { router.replace('/boards'); return }
    if (trip && !itinerary && !loading) generate()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, trip])

  // Rotate loading narration
  useEffect(() => {
    if (!loading) { setLoadingStep(0); return }
    const id = setInterval(() => setLoadingStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1)), 7000)
    return () => clearInterval(id)
  }, [loading])

  async function generate(customInstructions?: string) {
    if (!trip) return
    setLoading(true)
    setError('')

    const savedPlaces = cards.map((c) =>
      [c.location.nameEnglish, c.location.city, c.location.country].filter(Boolean).join(', ')
    )

    try {
      const res = await fetch('/api/itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip, savedPlaces, instructions: customInstructions }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to generate itinerary')

      const gen = data.itinerary as GeneratedItinerary
      saveItinerary(gen)
      setShowRefine(false)
      setInstructions('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate itinerary')
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) return null
  if (!trip) return null

  const days = Math.max(1, getDayCount(trip.startDate, trip.endDate))

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(160deg, #fdf3e3 0%, #fce8c5 40%, #f5d9a8 100%)' }}
    >
      {/* Header */}
      <header className="px-4 sm:px-6 py-4 flex items-center justify-between border-b border-amber-200/60 bg-white/40 backdrop-blur-md print-hidden">
        <div className="flex items-center gap-3">
          <Link href={`/board/${tripId}`} aria-label="Back to board" className="text-amber-700/60 hover:text-amber-700 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-amber-900 font-bold text-base" style={{ fontFamily: 'var(--font-playfair, Georgia, serif)' }}>
              {trip.destination} Itinerary
            </h1>
            <p className="text-amber-700/60 text-xs">{days}-day trip · {trip.priceRange}</p>
          </div>
        </div>

        {itinerary && !loading && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-3.5 py-2 bg-white/70 border border-amber-300 rounded-xl text-amber-800 hover:bg-white text-sm font-semibold transition-all"
              title="Print or save as PDF"
            >
              <Printer size={13} />
              <span className="hidden sm:inline">Print / PDF</span>
            </button>
            <button
              onClick={() => setShowRefine((v) => !v)}
              className="flex items-center gap-2 px-3.5 py-2 bg-amber-100 border border-amber-300 rounded-xl text-amber-800 hover:bg-amber-200 text-sm font-semibold transition-all"
            >
              <Wand2 size={13} />
              <span className="hidden sm:inline">Refine</span>
            </button>
            <button
              onClick={() => generate()}
              disabled={loading}
              aria-label="Regenerate itinerary"
              className="flex items-center gap-2 px-3.5 py-2 bg-amber-100 border border-amber-300 rounded-xl text-amber-800 hover:bg-amber-200 text-sm font-semibold transition-all disabled:opacity-50"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Regenerate</span>
            </button>
          </div>
        )}
      </header>

      {/* Refine panel */}
      <AnimatePresence>
        {showRefine && itinerary && !loading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-b border-amber-200/60 bg-white/50 backdrop-blur-md print-hidden"
          >
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
              <label className="text-xs font-bold text-amber-900 block mb-2">
                ✨ Tell the AI how to adjust your plan
              </label>
              <div className="flex gap-2">
                <input
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && instructions.trim() && generate(instructions)}
                  placeholder='e.g. "More street food, fewer museums, keep evenings relaxed"'
                  className="flex-1 bg-white border border-amber-200 rounded-xl px-4 py-2.5 text-sm text-[#2c1810] placeholder-amber-700/35 focus:outline-none focus:border-[#c94040]/60 transition-colors"
                />
                <button
                  onClick={() => instructions.trim() && generate(instructions)}
                  disabled={!instructions.trim()}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40 hover:opacity-90 shrink-0"
                  style={{ background: 'linear-gradient(135deg, #c94040, #e05555)' }}
                >
                  Refine & Regenerate
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col p-4 sm:p-6 max-w-4xl mx-auto w-full print-hidden">
        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <Sparkles size={44} className="text-amber-500" />
            </motion.div>
            <div className="text-center">
              <p className="text-amber-900 font-bold text-xl mb-2">Crafting your itinerary…</p>
              <AnimatePresence mode="wait">
                <motion.p
                  key={loadingStep}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="text-amber-700/70 text-sm"
                >
                  {LOADING_STEPS[loadingStep]}
                </motion.p>
              </AnimatePresence>
            </div>
            <div className="w-56 h-2 bg-amber-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-amber-500 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: '90%' }}
                transition={{ duration: 55, ease: 'easeInOut' }}
              />
            </div>
            <p className="text-amber-600/60 text-xs">Planning {days} days in {trip.destination} · usually 20–45 seconds</p>
          </div>
        )}

        {error && !loading && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="flex flex-col items-center gap-3 p-6 bg-red-50 border border-red-200 rounded-2xl max-w-sm text-center">
              <AlertTriangle size={28} className="text-red-400" />
              <p className="text-red-700 font-medium text-sm">{error}</p>
            </div>
            <button
              onClick={() => generate()}
              className="px-6 py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/30"
            >
              Try Again
            </button>
          </div>
        )}

        {itinerary && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col rounded-2xl overflow-hidden shadow-2xl shadow-amber-900/20"
            style={{ minHeight: 'max(600px, 78vh)' }}
          >
            <ItineraryBinder itinerary={itinerary} />
          </motion.div>
        )}

        {/* General tips */}
        {itinerary && !loading && itinerary.generalTips?.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-5 bg-white/60 border border-amber-200 rounded-2xl p-5 backdrop-blur-sm"
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={15} className="text-amber-500" />
              <h3 className="text-amber-900 font-bold text-sm">General Tips</h3>
              <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full border border-amber-200 font-medium">AI-suggested</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {itinerary.generalTips.map((tip, i) => (
                <p key={i} className="text-xs text-amber-800 flex gap-2">
                  <span className="text-amber-500 shrink-0 font-bold">•</span>
                  {tip}
                </p>
              ))}
            </div>
          </motion.div>
        )}

        {loading && (
          <div className="sr-only" role="status">Generating itinerary, please wait</div>
        )}
      </div>

      {/* ── Print-only flat document ── */}
      {itinerary && (
        <div className="print-only px-2">
          <h1 className="text-3xl font-bold mb-1" style={{ fontFamily: 'Georgia, serif' }}>
            {itinerary.destination} — Trip Itinerary
          </h1>
          <p className="text-sm text-stone-600 mb-1">{trip.startDate} → {trip.endDate} · {trip.paxCount} traveller{trip.paxCount > 1 ? 's' : ''}{itinerary.totalEstimatedCost ? ` · ${itinerary.totalEstimatedCost}` : ''}</p>
          <p className="text-sm mb-6">{itinerary.overview}</p>
          {itinerary.days.map((day, i) => (
            <div key={i} style={{ breakInside: 'avoid' }} className="mb-4">
              <DayPage day={day} accentColor={DAY_COLORS[i % DAY_COLORS.length]} destination={itinerary.destination} />
            </div>
          ))}
          {itinerary.generalTips?.length > 0 && (
            <div className="mt-2">
              <h3 className="font-bold text-sm mb-1">General tips</h3>
              {itinerary.generalTips.map((tip, i) => (
                <p key={i} className="text-xs mb-0.5">• {tip}</p>
              ))}
            </div>
          )}
          <p className="text-[10px] text-stone-400 mt-6">Generated with TravelClick ✈️</p>
        </div>
      )}
    </div>
  )
}
