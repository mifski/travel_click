'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { GeneratedItinerary, ItineraryDay, ItineraryTimeBlock, TravelCard, RealityReport, RealityMarks } from '@/lib/types'
import { googleMapsUrl } from '@/lib/utils'
import { dayReality } from '@/lib/reality'
import { RealityStamp, PaceRibbon, DayRealityPanel } from './RealityPanel'
import { Clock, MapPin, Utensils, Navigation, Info, Wallet } from 'lucide-react'

/* ═══════════════ Print view (light, flat document) ═══════════════ */

const CAT: Record<ItineraryTimeBlock['category'], {
  Icon: React.ElementType; dot: string; bg: string; border: string; label: string
}> = {
  activity:  { Icon: MapPin,      dot: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', label: 'Activity' },
  meal:      { Icon: Utensils,    dot: '#f97316', bg: '#fff7ed', border: '#fed7aa', label: 'Meal' },
  transport: { Icon: Navigation,  dot: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0', label: 'Transit' },
  rest:      { Icon: Clock,       dot: '#10b981', bg: '#f0fdf4', border: '#bbf7d0', label: 'Rest' },
}

const DAY_COLORS = ['#c94040', '#a86030', '#6b8f5e', '#7e9ab5', '#c9a84c', '#9b72bf', '#3a7a7a', '#c94080']

function PrintTimeBlock({ block, destination }: { block: ItineraryTimeBlock; destination: string }) {
  const c = CAT[block.category] ?? CAT.activity
  return (
    <div
      className="flex gap-3 p-3 rounded-xl border mb-2 last:mb-0"
      style={{ background: c.bg, borderColor: c.border, borderLeftWidth: 3, borderLeftColor: c.dot }}
    >
      <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5 w-14">
        <span className="text-[10px] font-mono font-bold leading-none" style={{ color: c.dot }}>{block.time}</span>
        <c.Icon size={11} style={{ color: c.dot }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[#1a0f00] text-sm leading-tight">{block.activity}</p>
        <a
          href={googleMapsUrl(block.place, destination)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 mt-0.5"
        >
          <MapPin size={9} className="text-amber-600 shrink-0" />
          <span className="text-[11px] text-amber-800 truncate">{block.place}</span>
        </a>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="text-[10px] text-slate-500">⏱ {block.duration}</span>
          {block.bookingRequired && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' }}>
              Book ahead
            </span>
          )}
        </div>
        {block.notes && <p className="text-[11px] text-slate-500 mt-1 italic">{block.notes}</p>}
      </div>
    </div>
  )
}

/** Flat light day page — used by the print/PDF export */
export function DayPage({ day, accentColor, destination }: { day: ItineraryDay; accentColor: string; destination: string }) {
  const sections: [string, ItineraryTimeBlock[]][] = [
    ['Morning', day.morning ?? []],
    ['Afternoon', day.afternoon ?? []],
    ['Evening', day.evening ?? []],
  ]
  return (
    <div className="p-6 paper-texture" style={{ background: '#fffef9' }}>
      <div className="mb-4 pb-3 border-b-2" style={{ borderColor: `${accentColor}30` }}>
        <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: accentColor }}>Day {day.day}</p>
        <h2 className="font-bold text-xl text-[#1a0f00] leading-tight" style={{ fontFamily: 'var(--font-playfair, Georgia, serif)' }}>
          {day.theme}
        </h2>
        <p className="text-xs text-[#6b4a32] font-mono mt-0.5">{day.date}</p>
        {day.estimatedCost && (
          <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border"
            style={{ color: accentColor, borderColor: `${accentColor}50` }}>
            <Wallet size={9} />
            {day.estimatedCost}
          </span>
        )}
      </div>
      {sections.map(([label, blocks]) => blocks.length > 0 && (
        <div key={label}>
          <div className="flex items-center gap-2 mt-4 mb-2 first:mt-0">
            <span className="text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: accentColor }}>{label}</span>
            <div className="flex-1 h-px" style={{ background: `${accentColor}40` }} />
          </div>
          {blocks.map((b, i) => <PrintTimeBlock key={i} block={b} destination={destination} />)}
        </div>
      ))}
      {day.travelTips?.length > 0 && (
        <div className="mt-4 p-3 rounded-xl border border-[#c0d4e8] bg-[#eff6ff]">
          <div className="flex items-center gap-2 mb-1.5">
            <Info size={12} className="text-[#7e9ab5]" />
            <p className="text-[10px] font-black uppercase tracking-widest text-[#3a5f7a]">Tips for today</p>
          </div>
          {day.travelTips.map((tip, i) => (
            <p key={i} className="text-xs text-[#3a5f7a] leading-relaxed mb-1">• {tip}</p>
          ))}
        </div>
      )}
    </div>
  )
}

export { DAY_COLORS }

/* ═══════════════ Dark espresso binder (screen) ═══════════════ */

const cream = (a: number) => `rgba(242,234,216,${a})`

/** Flatten a day's periods into one timeline */
function dayBlocks(day: ItineraryDay): ItineraryTimeBlock[] {
  return [...(day.morning ?? []), ...(day.afternoon ?? []), ...(day.evening ?? [])]
}

/** Pick up to 2 photo prints for a day from the board's pinned cards */
function pickPrints(day: ItineraryDay, dayIndex: number, cards: TravelCard[]): { card: TravelCard; time?: string }[] {
  const withImages = cards.filter((c) => c.imageUrl || c.thumbnailUrl)
  if (!withImages.length) return []

  const blocks = dayBlocks(day)
  const haystack = blocks.map((b) => `${b.place} ${b.activity}`.toLowerCase())
  const matched: { card: TravelCard; time?: string }[] = []

  for (const card of withImages) {
    if (matched.length >= 2) break
    const tokens = (card.location.nameEnglish || card.title)
      .toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 3)
    const hit = haystack.findIndex((h) => tokens.some((t) => h.includes(t)))
    if (hit >= 0) matched.push({ card, time: blocks[hit].time })
  }
  // Fill from remaining image cards, cycled by day so each spread looks different
  let cursor = dayIndex * 2
  while (matched.length < 2 && matched.length < withImages.length) {
    const candidate = withImages[cursor % withImages.length]
    cursor++
    if (!matched.some((m) => m.card.id === candidate.id)) matched.push({ card: candidate })
  }
  return matched
}

const PRINT_POS: React.CSSProperties[] = [
  { position: 'absolute', left: 0, top: 6, width: 290, transform: 'rotate(-2deg)' },
  { position: 'absolute', left: 130, top: 238, width: 270, transform: 'rotate(2.2deg)' },
]

interface Props {
  itinerary: GeneratedItinerary
  cards: TravelCard[]
  activeDay: number
  onDayChange: (idx: number) => void
  onRefine: (instructions: string) => void
  refining: boolean
  report?: RealityReport
  marks: RealityMarks
  checking: boolean
  onRecheck: () => void
}

export function ItineraryBinder({
  itinerary, cards, activeDay, onDayChange, onRefine, refining, report, marks, checking, onRecheck,
}: Props) {
  const [refineText, setRefineText] = useState('')
  const day = itinerary.days[Math.min(activeDay, itinerary.days.length - 1)]
  const realities = itinerary.days.map((d) => dayReality(d, report, marks))
  const reality = realities[Math.min(activeDay, itinerary.days.length - 1)]
  const blocks = dayBlocks(day)
  const prints = useMemo(() => pickPrints(day, activeDay, cards), [day, activeDay, cards])

  function submitRefine() {
    if (!refineText.trim() || refining) return
    onRefine(refineText.trim())
    setRefineText('')
  }

  return (
    <>
      {/* ── Day tabs ── */}
      <div className="swipe-row sm:flex-wrap items-center" style={{ gap: 8, padding: '22px var(--gutter) 4px' }}>
        {itinerary.days.map((d, i) => {
          const active = i === activeDay
          const short = d.theme.split(/[:—–]/)[0].trim()
          const label = `Day ${d.day} · ${short.length > 16 ? `${short.slice(0, 15)}…` : short}`
          return (
            <button
              key={i}
              onClick={() => onDayChange(i)}
              className={active ? 'pill-gold rounded-full font-bold' : 'rounded-full transition-colors'}
              style={active
                ? { padding: '9px 20px', fontSize: 12.5, cursor: 'pointer' }
                : { padding: '9px 20px', fontSize: 12.5, border: `1px solid ${cream(0.2)}`, color: cream(0.65), cursor: 'pointer' }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.borderColor = '#c9a84c' }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.borderColor = cream(0.2) }}
            >
              {!checking && report && (
                <span
                  aria-label={realities[i].checked ? 'Checked' : 'Check again'}
                  className="inline-block rounded-full"
                  style={{ width: 7, height: 7, marginRight: 7, background: realities[i].checked ? '#8fbf7a' : '#e0705f', verticalAlign: 'middle' }}
                />
              )}
              {label}
            </button>
          )
        })}
        {day.estimatedCost && (
          <span className="ml-auto pl-2 whitespace-nowrap" style={{ fontSize: 11.5, color: cream(0.55) }}>
            Day est. <span style={{ color: '#c9a84c', fontWeight: 700 }}>{day.estimatedCost}</span>
          </span>
        )}
      </div>

      {/* ── Day spread ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeDay}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22 }}
          className="flex flex-wrap"
          style={{ gap: 36, padding: '26px var(--gutter) 0' }}
        >
          {/* Timeline */}
          <div className="relative flex-1" style={{ paddingLeft: 26, minWidth: 'min(320px, 100%)' }}>
            <span
              aria-hidden="true"
              className="absolute"
              style={{ left: 5, top: 8, bottom: 8, width: 1, background: 'linear-gradient(180deg, rgba(201,168,76,.6), rgba(201,168,76,.1))' }}
            />

            <div className="flex items-center flex-wrap" style={{ gap: 14, marginBottom: 14, marginLeft: -26 }}>
              <RealityStamp reality={reality} checking={checking} />
              {!checking && (
                <button onClick={onRecheck} disabled={refining} style={{ fontSize: 11, color: cream(0.5) }} className="hover:text-[#c9a84c] disabled:opacity-40">
                  ↻ Re-check
                </button>
              )}
            </div>
            <div style={{ marginLeft: -26 }}>
              <PaceRibbon day={day} />
              <DayRealityPanel
                tripId={itinerary.tripId}
                reality={reality}
                stubs={report?.stubs.filter((s) => s.day === day.day) ?? []}
                checkedAt={report?.checkedAt}
                statuses={marks.stubs}
                onFix={onRefine}
                busy={refining || checking}
              />
            </div>

            {blocks.map((block, i) => (
              <div key={i} className="relative" style={{ marginBottom: 26 }}>
                <span
                  aria-hidden="true"
                  className="absolute rounded-full"
                  style={i === 0
                    ? { left: -26, top: 5, width: 11, height: 11, background: '#c9a84c', boxShadow: '0 0 12px rgba(201,168,76,.6)' }
                    : { left: -26, top: 5, width: 11, height: 11, border: '2px solid rgba(201,168,76,.5)', background: '#201209', boxSizing: 'border-box' }}
                />
                <div className="flex items-baseline flex-wrap" style={{ gap: 12 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.14em', color: '#c9a84c' }}>
                    {block.time}
                  </span>
                  <span className="font-display" style={{ fontWeight: 700, fontSize: 21, color: '#f2ead8' }}>
                    {block.activity}
                  </span>
                </div>
                {block.notes && (
                  <p style={{ margin: '6px 0 0', fontSize: 12.5, lineHeight: 1.6, color: cream(0.6), maxWidth: 430 }}>
                    {block.notes}
                  </p>
                )}
                <div className="flex items-baseline" style={{ gap: 14, marginTop: 8, fontSize: 11 }}>
                  <a
                    href={googleMapsUrl(block.place, itinerary.destination)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors hover:text-[#f2ead8]"
                    style={{ color: '#c9a84c', textDecoration: 'none', borderBottom: '1px dotted rgba(201,168,76,.5)' }}
                    title={block.place}
                  >
                    Open in Maps ↗
                  </a>
                  <span style={{ color: cream(0.55) }}>{block.duration}</span>
                  {block.bookingRequired && (
                    <span style={{ color: '#c9a84c', fontWeight: 700, letterSpacing: '.08em', fontSize: 9.5 }}>BOOK AHEAD</span>
                  )}
                </div>
              </div>
            ))}

            {/* Tips for the day */}
            {day.travelTips?.length > 0 && (
              <div style={{ marginTop: 4, maxWidth: 460 }}>
                <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.2em', color: 'rgba(201,168,76,.7)' }}>TIPS</span>
                {day.travelTips.map((tip, i) => (
                  <p key={i} style={{ margin: '4px 0 0', fontSize: 11.5, lineHeight: 1.55, color: cream(0.5) }}>
                    {tip}
                  </p>
                ))}
              </div>
            )}

            {/* "If it fits" pins the plan left out: one tap swaps one into this day */}
            {(itinerary.unusedPins?.length ?? 0) > 0 && (
              <div style={{ marginTop: 22, maxWidth: 500 }}>
                <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.2em', color: 'rgba(201,168,76,.7)' }}>SAVED BUT NOT PLANNED</span>
                <p style={{ margin: '4px 0 8px', fontSize: 11.5, color: cream(0.5) }}>Tap one to swap it into day {day.day} in place of its least important stop.</p>
                <div className="flex flex-wrap" style={{ gap: 6 }}>
                  {itinerary.unusedPins!.map((name) => (
                    <button
                      key={name}
                      type="button"
                      disabled={refining}
                      onClick={() => onRefine(`Swap in "${name}" in place of the least important stop, keeping the route sensible`)}
                      className="rounded-full transition-colors hover:border-[#c9a84c] hover:text-[#c9a84c] disabled:opacity-40"
                      style={{ padding: '7px 12px', fontSize: 12, border: `1px solid ${cream(0.25)}`, color: cream(0.75), minHeight: 34 }}
                    >
                      + {name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Refine bar */}
            <div className="flex" style={{ gap: 10, marginTop: 26, maxWidth: 500 }}>
              <input
                value={refineText}
                onChange={(e) => setRefineText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitRefine()}
                disabled={refining}
                placeholder='refine this day: "more street food, no museums…"'
                className="font-hand flex-1 focus:outline-none"
                style={{
                  padding: '11px 18px',
                  borderRadius: 999,
                  border: `1px dashed ${cream(0.3)}`,
                  background: 'transparent',
                  color: '#f2ead8',
                  fontSize: 17,
                }}
              />
              <button
                onClick={submitRefine}
                disabled={refining || !refineText.trim()}
                className="pill-gold pill-lift self-center rounded-full font-bold whitespace-nowrap disabled:opacity-60"
                style={{ padding: '11px 22px', fontSize: 12.5 }}
              >
                {refining ? 'Refining…' : '✦ Refine'}
              </button>
            </div>
          </div>

          {/* Prints column */}
          <div className="relative hidden lg:block" style={{ width: 420, minHeight: 540 }}>
            {prints.map((p, i) => (
              <div
                key={p.card.id}
                className="transition-transform hover:-translate-y-1.5"
                style={{
                  ...PRINT_POS[i] ?? PRINT_POS[1],
                  background: '#f2ead8',
                  padding: '11px 11px 15px',
                  borderRadius: 3,
                  boxShadow: i === 0
                    ? '0 30px 60px -12px rgba(0,0,0,.7), 0 0 40px -10px rgba(201,168,76,.2)'
                    : '0 30px 60px -12px rgba(0,0,0,.7)',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.card.imageUrl ?? p.card.thumbnailUrl}
                  alt={p.card.location.nameEnglish || p.card.title}
                  draggable={false}
                  className="block w-full object-cover"
                  style={{ height: i === 0 ? 195 : 230 }}
                />
                <div className="flex justify-between items-baseline" style={{ marginTop: 10, padding: '0 3px' }}>
                  <span className="font-display truncate" style={{ fontWeight: 700, fontSize: 15, color: '#2c1810' }}>
                    {p.time ? `${p.time} · ` : ''}{p.card.location.nameEnglish || p.card.title}
                  </span>
                  <span className="shrink-0" style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.12em', color: '#a86030', marginLeft: 8 }}>
                    № 0{i + 1}
                  </span>
                </div>
              </div>
            ))}
            <div
              aria-hidden="true"
              className="font-hand absolute"
              style={{ left: 36, top: 492, fontSize: 21, color: cream(0.6), transform: 'rotate(-2deg)', maxWidth: 340 }}
            >
              {day.theme.toLowerCase()}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  )
}
