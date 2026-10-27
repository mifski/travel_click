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
import { PlanSheet } from '@/components/Itinerary/PlanSheet'
import { planRequestBody } from '@/lib/plan-request'
import { unplacedMusts } from '@/lib/decide'
import { EMPTY_MARKS } from '@/lib/reality'
import { formatDateRange } from '@/lib/utils'
import { Printer, RotateCw } from 'lucide-react'
import { Logo } from '@/components/UI/Logo'
import { useCompact } from '@/lib/use-media'
import { DISCOVERY_LABELS, type TripPace } from '@/lib/types'

const PACE_LABEL: Record<TripPace, string> = { slow: 'Slow pace', balanced: 'Balanced pace', full: 'Full pace' }

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
  const [planOpen, setPlanOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const compact = useCompact()

  const isDemo = tripId === DEMO_TRIP_ID

  useEffect(() => { setMounted(true) }, [])

  // Deep-linked demo without seed
  useEffect(() => {
    if (mounted && !trip && isDemo) { void seedDemo() }
  }, [mounted, trip, isDemo])

  useEffect(() => {
    if (!mounted) return
    if (!trip && !isDemo) { router.replace('/boards'); return }
    // "Refine to include" from the board's NOT IN THE PLAN line
    const s = useTripStore.getState()
    const missing = new URLSearchParams(window.location.search).has('include')
      ? unplacedMusts(s.cards[tripId] ?? [], s.pinPriorities[tripId], itinerary)
      : []
    if (missing.length) {
      router.replace(`/board/${tripId}/itinerary`)
      void generate(`Include these must-go places: ${missing.map((c) => c.title).join(', ')}`)
    }
    else if (trip && !itinerary && !loading) setPlanOpen(true)
    else if (trip && itinerary && !report && !checking) void realityCheck(trip, itinerary)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, trip])

  /** Second pass after every generate/refine — the stamp stays "Checking…" until it lands */
  async function realityCheck(t: TripContext, it: GeneratedItinerary, onlyDays?: number[]) {
    setChecking(true)
    try {
      const res = await fetch('/api/reality-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip: t, itinerary: it, onlyDays }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Reality Check failed')
      const fresh = data.report as RealityReport
      const prev = useTripStore.getState().realityChecks[tripId]
      // A one-day re-check replaces just those days (and their tickets) in the existing report
      saveRealityCheck(onlyDays && prev ? {
        ...prev,
        checkedAt: fresh.checkedAt,
        days: [...prev.days.filter((d) => !onlyDays.includes(d.day)), ...fresh.days].sort((a, b) => a.day - b.day),
        stubs: [...prev.stubs.filter((st) => !onlyDays.includes(st.day)), ...fresh.stubs],
      } : fresh)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Reality Check failed')
    } finally {
      setChecking(false)
    }
  }

  async function generate(customInstructions?: string, tripOverride?: TripContext, isRefine = !!customInstructions) {
    const trip = tripOverride ?? useTripStore.getState().trips.find((t) => t.id === tripId)
    if (!trip) return
    if (isRefine) setRefining(true)
    else setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...planRequestBody(tripId, customInstructions), trip }),
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

  /** Reality Check fix, refine bar or swap-in: rewrite only this day, then re-check only this day */
  async function fixDay(dayNumber: number, change: string) {
    const t = useTripStore.getState().trips.find((x) => x.id === tripId)
    const it = useTripStore.getState().itineraries[tripId]
    if (!t || !it || refining) return
    setRefining(true)
    try {
      const res = await fetch('/api/itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...planRequestBody(tripId), trip: t, itinerary: it, fixDay: { day: dayNumber, instructions: change } }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Couldn’t change that day')
      const updated: GeneratedItinerary = { ...it, days: it.days.map((d) => (d.day === dayNumber ? data.day : d)) }
      saveItinerary(updated)
      // Drop the day's old findings now; the stamp reads Checking… until the re-check below lands
      const prev = useTripStore.getState().realityChecks[tripId]
      if (prev) saveRealityCheck({ ...prev, days: prev.days.filter((d) => d.day !== dayNumber) })
      toast.success(`Day ${dayNumber} updated ✦`)
      void realityCheck(t, updated, [dayNumber])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Couldn’t change that day')
    } finally {
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
        <div className="flex items-center justify-between flex-wrap gap-x-4 gap-y-3" style={{ padding: '20px var(--gutter)' }}>
          <Link href={`/board/${tripId}`} className="font-display" style={{ fontWeight: 800, fontSize: 19, color: '#f2ead8' }}>
            <Logo tone="dark" fontSize={19} />
          </Link>
          <div className="swipe-row order-last sm:order-none w-full sm:w-auto" style={{ gap: 26, fontSize: 12.5, color: cream(0.55), paddingBottom: 4 }}>
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
                  aria-label="Print or save as PDF"
                  className="rounded-full transition-all hover:border-[#c9a84c] hover:text-[#c9a84c] inline-flex items-center justify-center gap-1.5 min-w-[36px] min-h-[36px]"
                  style={{ padding: '7px 12px', border: `1px solid ${cream(0.25)}`, color: cream(0.7), fontSize: 11.5 }}
                >
                  <Printer size={13} aria-hidden="true" /> <span className="hidden sm:inline">Print / PDF</span>
                </button>
                <button
                  onClick={() => setPlanOpen(true)}
                  disabled={loading || refining}
                  title="Regenerate the whole itinerary"
                  aria-label="Regenerate the whole itinerary"
                  className="rounded-full transition-all hover:border-[#c9a84c] hover:text-[#c9a84c] disabled:opacity-40 inline-flex items-center justify-center gap-1.5 min-w-[36px] min-h-[36px]"
                  style={{ padding: '7px 12px', border: `1px solid ${cream(0.25)}`, color: cream(0.7), fontSize: 11.5 }}
                >
                  <RotateCw size={13} aria-hidden="true" /> <span className="hidden sm:inline">Regenerate</span>
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
        <div className="flex items-end justify-between flex-wrap gap-4" style={{ padding: '22px var(--gutter) 6px' }}>
          <div className="relative">
            <div style={{ fontSize: 11, letterSpacing: '.2em', lineHeight: 1.6, color: '#c9a84c', fontWeight: 600, marginBottom: 8 }}>
              THE BINDER · {dateRange} · {trip.paxCount} TRAVELLER{trip.paxCount > 1 ? 'S' : ''}
            </div>
            <h1 className="font-display m-0" style={{ fontWeight: 800, fontSize: 'clamp(36px, 10vw, 72px)', lineHeight: 0.95, color: '#f2ead8', letterSpacing: '-.02em' }}>
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
          <div className="flex flex-col items-start sm:items-end" style={{ gap: compact ? 6 : 14 }}>
          {/* Phones: the settings fold into one line so the trip strip sits near the top */}
          {itinerary && compact && (
            <button
              type="button"
              onClick={() => setSettingsOpen(!settingsOpen)}
              aria-expanded={settingsOpen}
              className="inline-flex items-center"
              style={{ gap: 8, minHeight: 36, fontSize: 12.5, color: cream(0.7) }}
            >
              <span aria-hidden="true" style={{ color: '#c9a84c' }}>{settingsOpen ? '▾' : '▸'}</span>
              {PACE_LABEL[trip.pace ?? 'balanced']} · starts {trip.dayStart ?? '09:00'} · {DISCOVERY_LABELS[trip.discovery ?? 2]}
              <span style={{ color: '#c9a84c', fontWeight: 600 }}>Change</span>
            </button>
          )}
          {itinerary && (!compact || settingsOpen) && (
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
          {itinerary?.totalEstimatedCost && (compact ? (
            <span style={{ fontSize: 12.5, color: cream(0.6) }}>
              Trip est. <span className="font-display" style={{ fontWeight: 800, fontSize: 16, color: '#c9a84c' }}>{itinerary.totalEstimatedCost}</span>
            </span>
          ) : (
            <div className="flex flex-col items-start sm:items-end gap-1.5">
              <span style={{ fontSize: 12, color: cream(0.55) }}>Trip total (est.)</span>
              <span className="font-display" style={{ fontWeight: 800, fontSize: 'clamp(22px, 6vw, 30px)', color: '#c9a84c' }}>
                {itinerary.totalEstimatedCost}
              </span>
            </div>
          ))}
          </div>
        </div>

        {/* ── Error state ── */}
        {error && !loading && (
          <div className="flex flex-col items-center gap-5" style={{ padding: '60px var(--gutter)' }}>
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
              onRefine={(instructions) => fixDay(itinerary.days[activeDay]?.day ?? activeDay + 1, instructions)}
              refining={refining}
              report={report}
              marks={marks}
              checking={checking}
              onRecheck={() => void realityCheck(trip, itinerary)}
            />

            {report && <BookByList tripId={tripId} report={report} marks={marks} destination={trip.destination} />}

            {/* General tips */}
            {itinerary.generalTips?.length > 0 && (
              <div style={{ padding: '40px var(--gutter) 0', maxWidth: 900 }}>
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

      <PlanSheet
        tripId={tripId}
        open={planOpen}
        onClose={() => { setPlanOpen(false); if (!itinerary) router.push(`/board/${tripId}`) }}
        onPlan={({ instructions, ...settings }) => {
          setPlanOpen(false)
          updateTrip(trip.id, settings)
          void generate(instructions || undefined, { ...trip, ...settings }, false)
        }}
      />

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
