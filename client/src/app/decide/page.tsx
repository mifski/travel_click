'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Plus, X, Scale, Loader2, Sparkles,
  Trophy, ExternalLink, MapPin, Wallet, BedDouble, ArrowRight,
  Snowflake, Leaf, Sun, Shuffle, CloudRain, Users, Stamp, Plane, TriangleAlert, type LucideIcon,
} from 'lucide-react'
import { useTripStore } from '@/lib/store'
import { toast } from '@/components/UI/Toaster'
import type { DestinationComparison, DestinationScore, TempPreference, TripContext } from '@/lib/types'
import { generateId, googleFlightsUrl, cn } from '@/lib/utils'
import { Logo } from '@/components/UI/Logo'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const TEMP_OPTIONS: { key: TempPreference; label: string; Icon: LucideIcon }[] = [
  { key: 'cold', label: 'Nice & cold', Icon: Snowflake },
  { key: 'mild', label: 'Mild', Icon: Leaf },
  { key: 'warm', label: 'Warm', Icon: Sun },
  { key: 'any', label: 'Don\'t mind', Icon: Shuffle },
]

const PRIORITY_OPTIONS = ['low prices', 'food', 'culture', 'nature', 'shopping', 'nightlife']

const LOADING_STEPS = [
  'Pulling climate normals for your months…',
  'Comparing on-the-ground costs…',
  'Checking visas & holiday traps…',
  'Weighing it all against your priorities…',
  'Writing the verdict…',
]

function nextOccurrence(monthName: string): { start: string; end: string } {
  const idx = MONTHS.findIndex((m) => m.toLowerCase() === monthName.toLowerCase())
  const now = new Date()
  let year = now.getFullYear()
  if (idx >= 0 && (idx < now.getMonth() || (idx === now.getMonth() && now.getDate() > 10))) year += 1
  const m = String((idx >= 0 ? idx : now.getMonth()) + 1).padStart(2, '0')
  return { start: `${year}-${m}-10`, end: `${year}-${m}-16` }
}

function tempDot(high: number): string {
  if (high <= 12) return '#7e9ab5'
  if (high <= 20) return '#6b8f5e'
  if (high <= 27) return '#c9a84c'
  return '#c94040'
}

function scoreStyle(score: number): { bg: string; text: string } {
  if (score >= 80) return { bg: '#6b8f5e', text: 'white' }
  if (score >= 60) return { bg: '#c9a84c', text: 'white' }
  return { bg: '#c94040', text: 'white' }
}

export default function DecidePage() {
  const router = useRouter()
  const saved = useTripStore((s) => s.lastComparison)
  const saveComparison = useTripStore((s) => s.saveComparison)
  const addTrip = useTripStore((s) => s.addTrip)

  const [candidates, setCandidates] = useState<string[]>(saved?.candidates ?? [])
  const [candidateInput, setCandidateInput] = useState('')
  const [months, setMonths] = useState<string[]>(saved?.months ?? [])
  const [tempPref, setTempPref] = useState<TempPreference>(saved?.tempPref ?? 'any')
  const [priorities, setPriorities] = useState<string[]>(saved?.priorities ?? ['low prices'])
  const [note, setNote] = useState(saved?.travelerNote ?? '')
  const [pax, setPax] = useState(saved?.paxCount ?? 2)
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [comparison, setComparison] = useState<DestinationComparison | null>(saved ?? null)

  function addCandidate() {
    const v = candidateInput.trim()
    if (!v || candidates.length >= 4) return
    if (candidates.some((c) => c.toLowerCase() === v.toLowerCase())) { setCandidateInput(''); return }
    setCandidates((c) => [...c, v])
    setCandidateInput('')
  }

  function toggleMonth(m: string) {
    setMonths((cur) => cur.includes(m) ? cur.filter((x) => x !== m) : cur.length < 3 ? [...cur, m] : cur)
  }

  function togglePriority(p: string) {
    setPriorities((cur) => cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p])
  }

  function loadExample() {
    setCandidates(['Guangzhou', 'Fukuoka', 'Shanghai'])
    setMonths(['November', 'December'])
    setTempPref('cold')
    setPriorities(['low prices', 'food'])
    setNote('Travelling with my mom. She only cares about prices and cool weather. Flights are ~S$950 to all three.')
    setPax(2)
  }

  async function compare() {
    if (candidates.length < 2 || months.length === 0) return
    setLoading(true)
    setLoadingStep(0)
    const stepTimer = setInterval(() => setLoadingStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1)), 5000)
    try {
      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidates, months, tempPref, priorities, travelerNote: note || undefined, paxCount: pax }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Comparison failed')
      const cmp: DestinationComparison = {
        id: generateId(),
        createdAt: new Date().toISOString(),
        candidates, months, tempPref, priorities, travelerNote: note || undefined, paxCount: pax,
        results: data.results,
        verdict: data.verdict,
      }
      saveComparison(cmp)
      setComparison(cmp)
      toast.success('Verdict is in!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Comparison failed')
    } finally {
      clearInterval(stepTimer)
      setLoading(false)
    }
  }

  async function startPlanning(score: DestinationScore) {
    const isWinner = comparison?.verdict.winner === score.destination
    const month = isWinner ? comparison!.verdict.bestMonth : (score.months[0]?.month ?? MONTHS[new Date().getMonth()])
    const { start, end } = nextOccurrence(month)
    const trip: TripContext = {
      id: generateId(),
      destination: score.destination,
      country: score.country,
      startDate: start,
      endDate: end,
      paxCount: pax,
      ageRanges: ['adults'],
      objectives: [],
      priceRange: 'mid',
      createdAt: new Date().toISOString(),
    }
    addTrip(trip)
    // Fire-and-forget cloud sync when signed in
    try {
      const { isSupabaseReady, supabase, saveTrip } = await import('@/lib/supabase')
      if (isSupabaseReady) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          void saveTrip({
            id: trip.id, user_id: session.user.id, destination: trip.destination, country: trip.country,
            start_date: trip.startDate, end_date: trip.endDate, pax_count: trip.paxCount,
            age_ranges: trip.ageRanges, objectives: trip.objectives, price_range: trip.priceRange,
            created_at: trip.createdAt,
          })
        }
      }
    } catch { /* local-only is fine */ }
    toast.success(`Board created for ${score.destination}. Dates are editable defaults`)
    router.push(`/board/${trip.id}`)
  }

  const canCompare = candidates.length >= 2 && months.length > 0 && !loading

  return (
    <div className="scrapbook-bg min-h-dvh">
      {/* Header */}
      <header className="px-6 sm:px-10 py-4 flex items-center justify-between"
        style={{ background: 'rgba(233,223,205,.85)', backdropFilter: 'blur(8px)' }}>
        <div className="flex items-center gap-4">
          <Link href="/" aria-label="Back to home" className="transition-colors hover:text-[#2c1810]" style={{ color: 'rgba(44,24,16,.68)' }}>
            <ArrowLeft size={18} />
          </Link>
          <Link href="/" className="font-display" style={{ fontWeight: 800, fontSize: 19, color: '#2c1810', letterSpacing: '-.02em' }}>
            <Logo fontSize={19} />
          </Link>
          <span style={{ fontSize: 12, color: 'rgba(44,24,16,.68)' }}>/&nbsp;&nbsp;Destination decider</span>
        </div>
        <span className="font-hand hidden sm:block" style={{ fontSize: 17, color: 'rgba(44,24,16,.68)', transform: 'rotate(-1deg)' }}>
          can&rsquo;t pick? let the evidence decide ⚖️
        </span>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* ── Form ── */}
        <div className="bg-white/80 backdrop-blur-sm border border-amber-200 rounded-2xl p-5 sm:p-6 shadow-sm mb-8">
          <div className="flex items-start justify-between gap-3 mb-5">
            <div>
              <h2 className="font-bold text-[#2c1810]">Where are you torn between?</h2>
              <p className="text-[#7a5a40] text-xs mt-0.5">2-4 cities · we&rsquo;ll compare weather, costs, visas & seasonal traps for your months</p>
            </div>
            <button onClick={loadExample}
              className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border-2 border-dashed border-[#7e9ab5]/50 text-[#3a5f7a] bg-[#c0d4e8]/30 hover:bg-[#c0d4e8]/60 transition-colors">
              Try the example
            </button>
          </div>

          {/* Candidates */}
          <div className="flex gap-2 mb-2">
            <input
              value={candidateInput}
              onChange={(e) => setCandidateInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCandidate()}
              placeholder={candidates.length >= 4 ? 'Max 4 candidates' : 'e.g. Fukuoka'}
              disabled={candidates.length >= 4}
              className="flex-1 bg-amber-50/60 border border-amber-200 rounded-xl px-4 py-2.5 text-sm text-[#2c1810] placeholder-amber-700/35 focus:outline-none focus:border-[#7e9ab5] focus:bg-white transition-colors disabled:opacity-50"
            />
            <button onClick={addCandidate} disabled={!candidateInput.trim() || candidates.length >= 4}
              aria-label="Add candidate destination"
              className="px-4 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-all hover:opacity-90"
              style={{ background: '#7e9ab5' }}>
              <Plus size={15} />
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mb-5 min-h-[30px]">
            {candidates.map((c) => (
              <span key={c} className="flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-full text-sm font-bold bg-[#c0d4e8]/50 border border-[#7e9ab5]/40 text-[#3a5f7a]">
                <MapPin size={11} /> {c}
                <button onClick={() => setCandidates((cur) => cur.filter((x) => x !== c))} aria-label={`Remove ${c}`}
                  className="w-5 h-5 rounded-full hover:bg-[#7e9ab5]/20 flex items-center justify-center transition-colors">
                  <X size={11} />
                </button>
              </span>
            ))}
            {candidates.length === 0 && <span className="text-xs text-[#7a5a40] py-1.5">No candidates yet. Add at least two</span>}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Months */}
            <div>
              <label className="text-xs font-bold text-[#6b4a32] mb-2 block">Candidate months <span className="font-normal opacity-60">(up to 3)</span></label>
              <div className="flex flex-wrap gap-1.5">
                {MONTHS.map((m) => {
                  const active = months.includes(m)
                  const disabled = !active && months.length >= 3
                  return (
                    <button key={m} onClick={() => toggleMonth(m)} disabled={disabled} aria-pressed={active}
                      className={cn('px-2.5 py-1.5 rounded-lg text-xs font-bold border-2 transition-all',
                        active ? 'text-white border-[#7e9ab5]' : disabled ? 'bg-amber-50 border-amber-100 text-amber-900/25' : 'bg-white border-amber-200 text-[#6b4a32] hover:border-[#7e9ab5]/50')}
                      style={active ? { background: '#7e9ab5' } : {}}>
                      {m.slice(0, 3)}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Temp pref */}
            <div>
              <label className="text-xs font-bold text-[#6b4a32] mb-2 block">Weather you want</label>
              <div className="flex flex-wrap gap-1.5">
                {TEMP_OPTIONS.map((t) => (
                  <button key={t.key} onClick={() => setTempPref(t.key)} aria-pressed={tempPref === t.key}
                    className={cn('px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all flex items-center gap-1.5',
                      tempPref === t.key ? 'text-white border-[#6b8f5e]' : 'bg-white border-amber-200 text-[#6b4a32] hover:border-[#6b8f5e]/50')}
                    style={tempPref === t.key ? { background: '#6b8f5e' } : {}}>
                    <t.Icon size={14} aria-hidden="true" />{t.label}
                  </button>
                ))}
              </div>

              <label className="text-xs font-bold text-[#6b4a32] mb-2 mt-4 block">What matters most</label>
              <div className="flex flex-wrap gap-1.5">
                {PRIORITY_OPTIONS.map((p) => {
                  const active = priorities.includes(p)
                  return (
                    <button key={p} onClick={() => togglePriority(p)} aria-pressed={active}
                      className={cn('px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all capitalize',
                        active ? 'text-white border-[#c94040]' : 'bg-white border-amber-200 text-[#6b4a32] hover:border-[#c94040]/50')}
                      style={active ? { background: '#c94040' } : {}}>
                      {p}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Note + pax + CTA */}
          <div className="mt-5 flex flex-col sm:flex-row gap-3">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder='Anything else? e.g. "with my mom, she cares about prices and cool weather"'
              className="flex-1 bg-amber-50/60 border border-amber-200 rounded-xl px-4 py-2.5 text-sm text-[#2c1810] placeholder-amber-700/35 focus:outline-none focus:border-[#7e9ab5] focus:bg-white transition-colors"
            />
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-2 bg-amber-50/60 border border-amber-200 rounded-xl px-3 py-1.5">
                <button onClick={() => setPax((p) => Math.max(1, p - 1))} aria-label="Fewer travellers" className="text-amber-700 font-bold px-1">−</button>
                <span className="text-sm font-bold text-[#2c1810] w-4 text-center">{pax}</span>
                <button onClick={() => setPax((p) => p + 1)} aria-label="More travellers" className="text-amber-700 font-bold px-1">+</button>
                <span className="text-[10px] text-[#7a5a40] font-semibold">pax</span>
              </div>
              <button onClick={compare} disabled={!canCompare}
                className="pill-coral pill-lift flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-sm disabled:opacity-40 whitespace-nowrap">
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Scale size={15} />}
                {loading ? 'Comparing…' : '✦ Compare'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div className="flex flex-col items-center justify-center gap-5 py-16">
            <motion.div animate={{ rotate: [0, -8, 8, 0] }} transition={{ duration: 1.6, repeat: Infinity }}>
              <Scale size={40} className="text-[#7e9ab5]" />
            </motion.div>
            <AnimatePresence mode="wait">
              <motion.p key={loadingStep} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                className="text-[#6b4a32] text-sm font-medium">
                {LOADING_STEPS[loadingStep]}
              </motion.p>
            </AnimatePresence>
            <p className="text-[#7a5a40] text-xs">Comparing {candidates.length} destinations · usually 15-30 seconds</p>
          </div>
        )}

        {/* ── Results ── */}
        {comparison && !loading && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>

            {/* Verdict banner */}
            <div className="rounded-2xl p-6 mb-6 relative overflow-hidden text-white shadow-xl"
              style={{ background: 'linear-gradient(135deg, #2c1810 0%, #4a2818 100%)' }}>
              <div className="stamp absolute top-4 right-5 !text-[9px] text-amber-200/40">Verdict</div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg" style={{ background: '#c9a84c' }}>
                  <Trophy size={22} className="text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-amber-200/60 text-[10px] uppercase tracking-widest font-bold mb-0.5">The verdict</p>
                  <h2 className="text-2xl font-bold leading-tight" style={{ fontFamily: 'var(--font-playfair, Georgia, serif)' }}>
                    {comparison.verdict.winner} <span className="text-amber-200/70 text-lg font-normal">in {comparison.verdict.bestMonth}</span>
                  </h2>
                  <p className="text-amber-100/70 text-sm mt-2 leading-relaxed">{comparison.verdict.reasoning}</p>
                  {comparison.verdict.runnerUp && (
                    <p className="text-amber-200/40 text-xs mt-2">Runner-up: {comparison.verdict.runnerUp}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Scorecards */}
            <div className={cn('grid grid-cols-1 gap-4', comparison.results.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-3')}>
              {[...comparison.results].sort((a, b) => b.fitScore - a.fitScore).map((r) => {
                const isWinner = r.destination === comparison.verdict.winner
                const sc = scoreStyle(r.fitScore)
                return (
                  <div key={r.destination}
                    className={cn('bg-[#fffef9] border rounded-2xl p-5 shadow-sm relative flex flex-col',
                      isWinner ? 'border-[#6b8f5e] ring-2 ring-[#6b8f5e]/30' : 'border-amber-200')}>
                    {isWinner && (
                      <div className="stamp absolute -top-2.5 right-4 !text-[8px] bg-[#fffef9] px-1" style={{ color: '#6b8f5e' }}>
                        Recommended
                      </div>
                    )}

                    {/* Title + score */}
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <h3 className="font-bold text-[#2c1810] text-lg leading-tight" style={{ fontFamily: 'var(--font-playfair, Georgia, serif)' }}>
                          {r.destination}
                        </h3>
                        <p className="text-[#7a5a40] text-xs">{r.country}{r.iata ? ` · ${r.iata}` : ''}</p>
                      </div>
                      <div className="shrink-0 w-12 h-12 rounded-full flex flex-col items-center justify-center shadow-md" style={{ background: sc.bg }}>
                        <span className="text-base font-black leading-none" style={{ color: sc.text }}>{r.fitScore}</span>
                        <span className="text-[7px] font-bold uppercase opacity-80" style={{ color: sc.text }}>fit</span>
                      </div>
                    </div>

                    <p className="text-xs text-[#3a2a10]/75 italic leading-relaxed mb-3">{r.vibe}</p>

                    {/* Month strips */}
                    <div className="space-y-1.5 mb-3">
                      {r.months.map((m) => (
                        <div key={m.month} className="flex items-center gap-2 rounded-lg border border-amber-100 bg-amber-50/50 px-2.5 py-1.5">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: tempDot(m.tempHighC) }} />
                          <span className="text-[11px] font-bold text-[#2c1810] w-8">{m.month.slice(0, 3)}</span>
                          <span className="text-[11px] text-[#6b4a32] font-semibold">{m.tempLowC}-{m.tempHighC}°C</span>
                          <span className="text-[10px] text-[#7a5a40] ml-auto flex items-center gap-1"><CloudRain size={10} aria-label="Rain" /> {m.rain} <Users size={10} className="ml-1.5" aria-label="Crowds" /> {m.crowds}</span>
                        </div>
                      ))}
                      {r.months.some((m) => m.note) && (
                        <p className="text-[10px] text-[#6b4a32] leading-snug px-0.5">
                          {r.months.filter((m) => m.note).map((m) => `${m.month.slice(0, 3)}: ${m.note}`).join(' · ')}
                        </p>
                      )}
                    </div>

                    {/* Costs + visa */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="rounded-lg border border-amber-100 bg-amber-50/50 px-2.5 py-2">
                        <p className="text-[9px] font-black uppercase tracking-wide text-[#6b4a32] flex items-center gap-1"><Wallet size={9} /> Daily / person</p>
                        <p className="text-sm font-bold text-[#2c1810]">{r.dailyCostUSD}</p>
                      </div>
                      <div className="rounded-lg border border-amber-100 bg-amber-50/50 px-2.5 py-2">
                        <p className="text-[9px] font-black uppercase tracking-wide text-[#6b4a32] flex items-center gap-1"><BedDouble size={9} /> Hotel / night</p>
                        <p className="text-sm font-bold text-[#2c1810]">{r.hotelNightUSD}</p>
                      </div>
                    </div>

                    <div className="text-[11px] leading-relaxed space-y-1.5 mb-3">
                      <p className="text-[#3a5f7a]"><span className="font-bold inline-flex items-center gap-1"><Stamp size={11} aria-hidden="true" /> Entry:</span> {r.visaNote}</p>
                      <p className="text-[#6b4a32]"><span className="font-bold inline-flex items-center gap-1"><Plane size={11} aria-hidden="true" /> Flights:</span> {r.flightNote}</p>
                    </div>

                    {/* Highlights / watchouts */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {r.highlights.map((h) => (
                        <span key={h} className="text-[10px] px-2 py-0.5 rounded-full bg-[#c8dcc0]/50 border border-[#6b8f5e]/30 text-[#3a6030] font-semibold">{h}</span>
                      ))}
                    </div>
                    {r.watchouts?.length > 0 && (
                      <div className="mb-3">
                        {r.watchouts.map((w) => (
                          <p key={w} className="text-[10px] text-[#8a3050] leading-snug flex gap-1"><TriangleAlert size={11} className="shrink-0 mt-px" aria-hidden="true" />{w}</p>
                        ))}
                      </div>
                    )}

                    <p className="text-[11px] text-[#6b4a32] leading-relaxed mb-4 border-t border-dashed border-amber-200 pt-2">
                      <span className="font-bold">Why this score:</span> {r.fitReason}
                    </p>

                    {/* Actions */}
                    <div className="mt-auto flex gap-2">
                      <button onClick={() => startPlanning(r)}
                        className="pill-lift flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-xs font-semibold text-white"
                        style={isWinner
                          ? { background: '#6b8f5e', boxShadow: '0 3px 0 #557a49' }
                          : { background: '#c94040', boxShadow: '0 3px 0 #a12f2f' }}>
                        Start planning <ArrowRight size={12} />
                      </button>
                      <a href={googleFlightsUrl(r.destination, isWinner ? comparison.verdict.bestMonth : r.months[0]?.month)}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-2.5 rounded-full text-xs font-semibold transition-colors hover:text-[#2c1810]"
                        style={{ border: '1px solid rgba(44,24,16,.18)', color: 'rgba(44,24,16,.68)' }}>
                        <ExternalLink size={11} /> Flights
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>

            <p className="text-center text-[#7a5a40] text-xs mt-6 flex items-center justify-center gap-1.5">
              <Sparkles size={11} /> AI-estimated from climate normals & typical prices. Always sanity-check fares before booking
            </p>
          </motion.div>
        )}

        {/* Empty state */}
        {!comparison && !loading && (
          <div className="text-center py-12 text-[#7a5a40]">
            <Scale size={44} strokeWidth={1.5} className="mx-auto mb-4" aria-hidden="true" />
            <p className="font-medium">Add your candidate cities and months. The verdict takes ~20 seconds</p>
          </div>
        )}
      </div>
    </div>
  )
}
