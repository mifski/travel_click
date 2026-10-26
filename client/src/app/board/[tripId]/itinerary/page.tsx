'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useTripStore } from '@/lib/store'
import { useAuth } from '@/lib/auth-context'
import { ItineraryBinder, DayPage, DAY_COLORS } from '@/components/Itinerary/ItineraryBinder'
import { GenerationOverlay } from '@/components/UI/GenerationOverlay'
import { toast } from '@/components/UI/Toaster'
import { DEMO_TRIP_ID, seedDemo } from '@/lib/demo-data'
import type { GeneratedItinerary, RealityReport, TripContext } from '@/lib/types'
import { BookByList, PaceControl } from '@/components/Itinerary/RealityPanel'
import { EMPTY_MARKS } from '@/lib/reality'
import { formatDateRange } from '@/lib/utils'
import { Printer, RotateCw } from 'lucide-react'

const cream = (a: number) => `rgba(242,234,216,${a})`

const REFINE_STEPS = [
  'Re-reading your pins…',
  'Reworking the day…',
  'Rebalancing the pace…',
  'Re-pricing each stop…',
  'Binding the pages…',
]

export default function ItineraryPage() {
  const { tripId } = useParams() as { tripId: string }
  const router = useRouter()
  const trip = useTripStore((s) => s.trips.find((t) => t.id === tripId) ?? null)
  const cards = useTripStore((s) => s.cards[tripId]) ?? []
  const itinerary = useTripStore((s) => s.itineraries[tripId] ?? null)
  const saveItinerary = useTripStore((s) => s.saveItinerary)
  const report = useTripStore((s) => s.realityChecks[tripId])
  const marks = useTripStore((s) => s.realityMarks[tripId]) ?? EMPTY_MARKS
  const saveRealityCheck = useTripStore((s) => s.saveRealityCheck)
  const updateTrip = useTripStore((s) => s.updateTrip)
  const { user, profile } = useAuth()

  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [refining, setRefining] = useState(false)
  const [error, setError] = useState('')
  const [activeDay, setActiveDay] = useState(0)
  const [checking, setChecking] = useState(false)

  const isDemo = tripId === DEMO_TRIP_ID

  useEffect(() => { setMounted(true) }, [])

  // Deep-linked demo without seed
  useEffect(() => {
    if (mounted && !trip && isDemo) { void seedDemo() }
  }, [mounted, trip, isDemo])

  useEffect(() => {
    if (!mounted) return
    if (!trip && !isDemo) { router.replace('/boards'); return }
    if (trip && !itinerary && !loading) generate()
    else if (trip && itinerary && !report && !checking) void realityCheck(trip, itinerary)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, trip])

  /** Second pass after every generate/refine — the stamp stays "Checking…" until it lands */
  async function realityCheck(t: TripContext, it: GeneratedItinerary) {
    setChecking(true)
    try {
      const res = await fetch('/api/reality-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip: t, itinerary: it }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Reality Check failed')
      saveRealityCheck(data.report as RealityReport)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Reality Check failed')
    } finally {
      setChecking(false)
    }
  }

  async function generate(customInstructions?: string, tripOverride?: TripContext) {
    const trip = tripOverride ?? useTripStore.getState().trips.find((t) => t.id === tripId)
    if (!trip) return
    const isRefine = !!customInstructions
    if (isRefine) setRefining(true)
    else setLoading(true)
    setError('')

    const savedPlaces = cards.map((c) =>
      [c.location.nameEnglish, c.location.city, c.location.country].filter(Boolean).join(', ')
    )

    try {
      const res = await fetch('/api/itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trip, savedPlaces, instructions: customInstructions,
          flights: useTripStore.getState().budgets[tripId]?.flights ?? [],
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to generate itinerary')

      saveItinerary(data.itinerary as GeneratedItinerary)
      if (isRefine) toast.success('Refined, your binder is updated ✦')
      void realityCheck(trip, data.itinerary as GeneratedItinerary)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate itinerary'
      if (isRefine) toast.error(msg)
      else setError(msg)
    } finally {
      setLoading(false)
      setRefining(false)
    }
  }

  if (!mounted || !trip) return null

  const dateRange = formatDateRange(trip.startDate, trip.endDate)
  const ghost = trip.destination === 'Tokyo' ? '東京' : trip.destination.toUpperCase()
  const avatarInitial = (profile?.display_name ?? user?.email ?? 'Traveller')[0]?.toUpperCase() ?? 'T'

  const navLinks = [
    { label: 'Stays', tool: 'stays' },
    { label: 'Brief', tool: 'brief' },
    { label: 'Packing', tool: 'packing' },
  ]

  return (
    <div
      className="min-h-dvh"
      style={{
        background: '#201209',
        backgroundImage:
          'radial-gradient(ellipse at 50% -10%, rgba(201,168,76,.14), transparent 55%), radial-gradient(ellipse at 90% 100%, rgba(201,64,64,.08), transparent 45%)',
        paddingBottom: 48,
        animation: 'tc-fade .3s ease-out',
      }}
    >
      <div className="mx-auto print-hidden" style={{ maxWidth: 1280 }}>

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between flex-wrap gap-4" style={{ padding: '20px 40px' }}>
          <Link href={`/board/${tripId}`} className="font-display" style={{ fontWeight: 800, fontSize: 19, color: '#f2ead8' }}>
            TravelClick<span style={{ color: '#c9a84c' }}>.</span>
          </Link>
          <div className="flex flex-wrap" style={{ gap: 26, fontSize: 12, color: cream(0.55) }}>
            <Link href={`/board/${tripId}`} className="transition-colors hover:text-[#f2ead8]">← Moodboard</Link>
            <span style={{ color: '#f2ead8', borderBottom: '2px solid #c9a84c', paddingBottom: 3 }}>Itinerary</span>
            {navLinks.map((l) => (
              <Link key={l.tool} href={`/board/${tripId}?tool=${l.tool}`} className="transition-colors hover:text-[#f2ead8]">
                {l.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {itinerary && !loading && (
              <>
                <button
                  onClick={() => window.print()}
                  className="rounded-full transition-all hover:border-[#c9a84c] hover:text-[#c9a84c] inline-flex items-center gap-1.5"
                  style={{ padding: '7px 16px', border: `1px solid ${cream(0.25)}`, color: cream(0.7), fontSize: 11.5 }}
                >
                  <Printer size={13} aria-hidden="true" /> Print / PDF
                </button>
                <button
                  onClick={() => generate()}
                  disabled={loading || refining}
                  title="Regenerate the whole itinerary"
                  className="rounded-full transition-all hover:border-[#c9a84c] hover:text-[#c9a84c] disabled:opacity-40 inline-flex items-center gap-1.5"
                  style={{ padding: '7px 16px', border: `1px solid ${cream(0.25)}`, color: cream(0.7), fontSize: 11.5 }}
                >
                  <RotateCw size={13} aria-hidden="true" /> Regenerate
                </button>
              </>
            )}
            <span
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold"
              style={{ background: 'linear-gradient(135deg, #c9a84c, #a86030)', color: '#201209', fontSize: 12 }}
            >
              {avatarInitial}
            </span>
          </div>
        </div>

        {/* ── Masthead ── */}
        <div className="flex items-end justify-between flex-wrap gap-4" style={{ padding: '22px 40px 6px' }}>
          <div className="relative">
            <div style={{ fontSize: 11, letterSpacing: '.3em', color: '#c9a84c', fontWeight: 600, marginBottom: 8 }}>
              THE BINDER · {dateRange} · {trip.paxCount} TRAVELLER{trip.paxCount > 1 ? 'S' : ''}
            </div>
            <h1 className="font-display m-0" style={{ fontWeight: 800, fontSize: 72, lineHeight: 0.92, color: '#f2ead8', letterSpacing: '-.02em' }}>
              {trip.destination},{' '}
              <span className="italic" style={{ fontWeight: 500, color: cream(0.75) }}>day by day</span>
            </h1>
            <span
              aria-hidden="true"
              className="font-display absolute pointer-events-none select-none whitespace-nowrap hidden xl:block"
              style={{ right: -190, top: -18, fontWeight: 900, fontSize: ghost.length <= 4 ? 130 : 80, color: cream(0.045) }}
            >
              {ghost}
            </span>
          </div>
          {itinerary && (
            <PaceControl
              key={`${trip.pace}-${trip.dayStart}-${trip.discovery}-${trip.homeBase}`}
              settings={{
                pace: trip.pace ?? 'balanced',
                dayStart: trip.dayStart ?? '09:00',
                discovery: trip.discovery ?? 2,
                homeBase: trip.homeBase ?? '',
              }}
              disabled={loading || refining}
              onApply={(settings) => {
                const patch = { ...settings, homeBase: settings.homeBase || undefined }
                updateTrip(trip.id, patch)
                void generate(undefined, { ...trip, ...patch })
              }}
            />
          )}
          {itinerary?.totalEstimatedCost && (
            <div className="flex flex-col items-end gap-1.5" style={{ paddingBottom: 8 }}>
              <span style={{ fontSize: 12, color: cream(0.55) }}>Trip total (est.)</span>
              <span className="font-display" style={{ fontWeight: 800, fontSize: 30, color: '#c9a84c' }}>
                {itinerary.totalEstimatedCost}
              </span>
            </div>
          )}
        </div>

        {/* ── Error state ── */}
        {error && !loading && (
          <div className="flex flex-col items-center gap-5" style={{ padding: '60px 40px' }}>
            <p className="font-hand text-center" style={{ fontSize: 24, color: cream(0.7), maxWidth: 420 }}>
              the binder didn&rsquo;t make it off the press: {error}
            </p>
            <button
              onClick={() => generate()}
              className="pill-gold pill-lift rounded-full font-bold"
              style={{ padding: '12px 26px', fontSize: 13 }}
            >
              ✦ Try again
            </button>
          </div>
        )}

        {/* ── Binder ── */}
        {itinerary && !error && (
          <>
            <ItineraryBinder
              itinerary={itinerary}
              cards={cards}
              activeDay={activeDay}
              onDayChange={setActiveDay}
              onRefine={(instructions) => generate(`For day ${activeDay + 1}: ${instructions}`)}
              refining={refining}
              report={report}
              marks={marks}
              checking={checking}
              onRecheck={() => void realityCheck(trip, itinerary)}
            />

            {report && <BookByList tripId={tripId} report={report} marks={marks} destination={trip.destination} />}

            {/* General tips */}
            {itinerary.generalTips?.length > 0 && (
              <div style={{ padding: '40px 40px 0', maxWidth: 900 }}>
                <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.2em', color: 'rgba(201,168,76,.7)' }}>
                  GOOD TO KNOW
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: '6px 28px', marginTop: 8 }}>
                  {itinerary.generalTips.map((tip, i) => (
                    <p key={i} className="m-0 flex gap-2" style={{ fontSize: 11.5, lineHeight: 1.6, color: cream(0.55) }}>
                      <span style={{ color: '#c9a84c' }} className="shrink-0">·</span>
                      {tip}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* First generation + refine both run under the staged overlay */}
      <GenerationOverlay show={loading} />
      <GenerationOverlay show={refining} title="Refining this day" steps={REFINE_STEPS} />

      {/* ── Print-only flat document ── */}
      {itinerary && (
        <div className="print-only px-2" style={{ background: 'white', color: '#1a0f00' }}>
          <h1 className="text-3xl font-bold mb-1" style={{ fontFamily: 'Georgia, serif' }}>
            {itinerary.destination}: Trip Itinerary
          </h1>
          <p className="text-sm text-stone-600 mb-1">
            {trip.startDate} → {trip.endDate} · {trip.paxCount} traveller{trip.paxCount > 1 ? 's' : ''}
            {itinerary.totalEstimatedCost ? ` · ${itinerary.totalEstimatedCost}` : ''}
          </p>
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
          <p className="text-[10px] text-stone-400 mt-6">Generated with TravelClick</p>
        </div>
      )}
    </div>
  )
}
