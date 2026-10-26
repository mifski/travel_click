'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useTripStore } from '@/lib/store'
import { getCategoryFromTags } from '@/lib/categories'
import { getDayCount } from '@/lib/utils'
import { DISCOVERY_LABELS, type PinPriority, type TripPace, type TripDiscovery, type TravelCard } from '@/lib/types'

const INK = '#2c1810'
const EMPTY: TravelCard[] = []
const CHOICES: { key: PinPriority; label: string }[] = [
  { key: 'must', label: 'Must go' },
  { key: 'maybe', label: 'If it fits' },
  { key: 'skip', label: 'Skip' },
]

export interface PlanChoices {
  pace: TripPace
  dayStart: string
  discovery: TripDiscovery
  instructions: string
}

/**
 * The step before generating: which pins are must-go, which are optional, which to leave out,
 * plus pace and anything else. Pin choices save as you tap; the rest goes with the request.
 */
export function PlanSheet({ tripId, open, onClose, onPlan }: {
  tripId: string
  open: boolean
  onClose: () => void
  onPlan: (choices: PlanChoices) => void
}) {
  if (typeof document === 'undefined') return null
  return createPortal(
    <AnimatePresence>{open && <Sheet tripId={tripId} onClose={onClose} onPlan={onPlan} />}</AnimatePresence>,
    document.body,
  )
}

function Sheet({ tripId, onClose, onPlan }: { tripId: string; onClose: () => void; onPlan: (c: PlanChoices) => void }) {
  const trip = useTripStore((s) => s.trips.find((t) => t.id === tripId))
  const cards = useTripStore((s) => s.cards[tripId]) ?? EMPTY
  const priorities = useTripStore((s) => s.pinPriorities[tripId])
  const stays = useTripStore((s) => s.stays[tripId]?.booked)
  const setPinPriority = useTripStore((s) => s.setPinPriority)
  const [discovery, setDiscovery] = useState<TripDiscovery>(trip?.discovery ?? 2)

  if (!trip) return null
  const days = Math.max(1, getDayCount(trip.startDate, trip.endDate))
  const prio = (id: string): PinPriority => priorities?.[id] ?? 'maybe'

  // Group pins by category so a crowded group (nine ramen spots) is easy to thin out
  const groups = new Map<string, TravelCard[]>()
  for (const c of cards) {
    const label = getCategoryFromTags(c.tags).label
    groups.set(label, [...(groups.get(label) ?? []), c])
  }
  const mustCount = cards.filter((c) => prio(c.id) === 'must').length
  const maybeCount = cards.filter((c) => prio(c.id) === 'maybe').length

  return (
    <motion.div
      className="fixed inset-0 z-[205] flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: 'rgba(32,18,9,.6)', backdropFilter: 'blur(3px)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.form
        role="dialog"
        aria-label="Before we plan"
        className="w-full flex flex-col"
        style={{ maxWidth: 560, maxHeight: '92dvh', background: '#fffef9', borderRadius: '18px 18px 0 0', boxShadow: '0 40px 90px -20px rgba(0,0,0,.6)' }}
        initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          const f = new FormData(e.currentTarget)
          onPlan({
            pace: (f.get('pace') as TripPace) || 'balanced',
            dayStart: String(f.get('dayStart') || '09:00'),
            discovery,
            instructions: String(f.get('instructions') ?? '').trim(),
          })
        }}
      >
        <div className="flex items-start justify-between gap-3" style={{ padding: '20px 22px 12px' }}>
          <div>
            <h2 className="font-display m-0" style={{ fontWeight: 800, fontSize: 24, color: INK }}>Before we plan</h2>
            <p className="m-0" style={{ fontSize: 13, color: 'rgba(44,24,16,.68)', marginTop: 2 }}>
              {cards.length} pins for {days} day{days > 1 ? 's' : ''}. Must-go pins always make it in; the rest only if they fit the route and pace.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 rounded-full hover:bg-black/5"><X size={16} /></button>
        </div>

        <div className="overflow-y-auto" style={{ padding: '0 22px 8px' }}>
          {[...groups.entries()].map(([label, list]) => {
            const crowded = list.length > days + 1
            return (
              <section key={label} style={{ marginTop: 14 }}>
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="m-0 font-bold" style={{ fontSize: 13.5, color: INK }}>{label} <span style={{ fontWeight: 500, color: '#7a5a40' }}>{list.length}</span></h3>
                  {crowded && (
                    <span className="font-hand" style={{ fontSize: 16, color: '#a86030' }}>
                      lots for {days} days, we&rsquo;ll pick the best fits
                    </span>
                  )}
                </div>
                <ul className="m-0 p-0 list-none" style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {list.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-2 flex-wrap" style={{ padding: '8px 10px', background: '#faf6f0', borderRadius: 10 }}>
                      <span className="min-w-0 truncate" style={{ fontSize: 13, color: INK, flex: '1 1 150px' }}>
                        {c.location.nameEnglish || c.title}
                      </span>
                      <span role="radiogroup" aria-label={`Plan ${c.location.nameEnglish || c.title}`} className="flex shrink-0" style={{ border: '1px solid rgba(44,24,16,.15)', borderRadius: 999, padding: 2 }}>
                        {CHOICES.map((ch) => {
                          const on = prio(c.id) === ch.key
                          return (
                            <button
                              key={ch.key}
                              type="button"
                              role="radio"
                              aria-checked={on}
                              onClick={() => setPinPriority(tripId, c.id, ch.key)}
                              className="rounded-full font-semibold transition-colors"
                              style={{
                                padding: '5px 10px', fontSize: 11.5, minHeight: 30,
                                background: on ? (ch.key === 'must' ? '#c94040' : ch.key === 'skip' ? '#7a6655' : INK) : 'transparent',
                                color: on ? '#fffef9' : 'rgba(44,24,16,.7)',
                              }}
                            >
                              {ch.label}
                            </button>
                          )
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}

          <section className="grid gap-3 sm:grid-cols-2" style={{ marginTop: 20 }}>
            <label style={{ fontSize: 12, color: '#6b4a32' }}>
              Pace
              <select name="pace" defaultValue={trip.pace ?? 'balanced'} className="w-full" style={{ marginTop: 4, padding: '9px 12px', borderRadius: 10, border: '1.5px solid rgba(44,24,16,.16)', background: '#fff', color: INK, fontSize: 13 }}>
                <option value="slow">Slow: 2 to 3 stops a day</option>
                <option value="balanced">Balanced: 3 to 4 stops</option>
                <option value="full">Full: 5 to 6 stops</option>
              </select>
            </label>
            <label style={{ fontSize: 12, color: '#6b4a32' }}>
              Days start around
              <input type="time" name="dayStart" defaultValue={trip.dayStart ?? '09:00'} className="w-full" style={{ marginTop: 4, padding: '8px 12px', borderRadius: 10, border: '1.5px solid rgba(44,24,16,.16)', background: '#fff', color: INK, fontSize: 13 }} />
            </label>
            <label className="sm:col-span-2" style={{ fontSize: 12, color: '#6b4a32' }}>
              Places we add: <b style={{ color: INK }}>{DISCOVERY_LABELS[discovery]}</b>
              <input
                type="range" min={0} max={4} step={1} value={discovery}
                onChange={(e) => setDiscovery(Number(e.target.value) as TripDiscovery)}
                aria-valuetext={DISCOVERY_LABELS[discovery]}
                className="w-full" style={{ marginTop: 6, accentColor: '#c94040' }}
              />
              <span className="flex justify-between" style={{ fontSize: 11, color: '#7a5a40' }}><span>Classics</span><span>Hidden gems</span></span>
            </label>
            <p className="sm:col-span-2 m-0" style={{ fontSize: 12, color: '#6b4a32' }}>
              {stays?.length
                ? <>Staying at {stays.map((s) => s.name).join(', then ')}. Days start and end there.</>
                : <>No stays added yet. Add your hotels in Stays and each day starts and ends there.</>}
            </p>
            <label className="sm:col-span-2" style={{ fontSize: 12, color: '#6b4a32' }}>
              Anything else?
              <textarea
                name="instructions"
                rows={2}
                maxLength={500}
                placeholder="e.g. one big shopping day, no early starts, vegetarian dinners"
                className="w-full resize-none"
                style={{ marginTop: 4, padding: '9px 12px', borderRadius: 10, border: '1.5px solid rgba(44,24,16,.16)', background: '#fff', color: INK, fontSize: 13 }}
              />
            </label>
          </section>
        </div>

        <div className="flex items-center justify-between gap-3" style={{ padding: '12px 22px calc(16px + env(safe-area-inset-bottom))', borderTop: '1px solid rgba(44,24,16,.1)' }}>
          <span style={{ fontSize: 12, color: '#7a5a40' }}>{mustCount} must go, {maybeCount} if they fit</span>
          <button type="submit" className="pill-ink pill-lift font-semibold" style={{ padding: '12px 22px', borderRadius: 12, fontSize: 14 }}>
            Plan my trip ✦
          </button>
        </div>
      </motion.form>
    </motion.div>
  )
}
