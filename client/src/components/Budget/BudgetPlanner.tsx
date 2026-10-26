'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ExternalLink, Plane, BedDouble, UtensilsCrossed, Plus, Trash2, PlaneTakeoff, PlaneLanding, Search } from 'lucide-react'
import type { TripContext, PriceRange, BookedFlight } from '@/lib/types'
import { useTripStore } from '@/lib/store'
import { getDayCount, googleFlightsUrl, generateId, formatSGD, cn } from '@/lib/utils'

/** Mid-point assumptions per price tier (S$) when no better signal exists */
const NIGHT_RATE: Record<PriceRange, number> = { budget: 75, mid: 200, luxury: 510 }
const DAILY_PP: Record<PriceRange, number> = { budget: 60, mid: 115, luxury: 230 }

/** Pull a per-person-per-day midpoint out of strings like "~S$130–175 per person / day" */
function parseDailyCost(s?: string): number | null {
  if (!s) return null
  const nums = s.match(/\d+/g)?.map(Number).filter((n) => n > 5 && n < 2000)
  if (!nums?.length) return null
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length)
}

interface Props {
  trip: TripContext
}

export function BudgetPlanner({ trip }: Props) {
  const budget = useTripStore((s) => s.budgets[trip.id]) ?? {}
  const setBudget = useTripStore((s) => s.setBudget)
  const itinerary = useTripStore((s) => s.itineraries[trip.id] ?? null)

  const days = Math.max(1, getDayCount(trip.startDate, trip.endDate))
  const nights = Math.max(1, days - 1)
  const rooms = Math.max(1, Math.ceil(trip.paxCount / 2))

  const aiDaily = parseDailyCost(itinerary?.totalEstimatedCost)
  const dailyPP = aiDaily ?? DAILY_PP[trip.priceRange]

  // Booked fares replace the per-person estimate as soon as any booked flight has a price
  const booked = budget.flights ?? []
  const pricedFlights = booked.filter((f) => f.price != null)
  const usingBooked = pricedFlights.length > 0
  const flights = usingBooked
    ? pricedFlights.reduce((sum, f) => sum + (f.price ?? 0), 0)
    : (budget.flightPerPerson ?? 0) * trip.paxCount
  const stay = nights * rooms * NIGHT_RATE[trip.priceRange]
  const onTheGround = dailyPP * days * trip.paxCount
  const projected = flights + stay + onTheGround

  const total = budget.total ?? 0
  const pct = total > 0 ? Math.min(150, Math.round((projected / total) * 100)) : null
  const over = total > 0 && projected > total

  const inputCls = 'w-full bg-amber-50/60 border border-amber-200 rounded-xl px-3 py-2 text-sm text-[#2c1810] placeholder-amber-700/35 focus:outline-none focus:border-[#c9a84c] focus:bg-white transition-colors'
  const labelCls = 'text-[10px] font-black uppercase tracking-wide text-[#6b4a32] mb-1 block'

  return (
    <div>
      <div className="flex items-center justify-between mb-1 gap-3 flex-wrap">
        <span className="uppercase font-semibold" style={{ fontSize: 11, letterSpacing: '.18em', color: '#c9a84c' }}>
          Projected total vs your budget
        </span>
        <a href={googleFlightsUrl(trip.destination, trip.startDate)} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-full text-xs font-semibold transition-colors hover:text-[#2c1810]"
          style={{ padding: '7px 14px', border: '1px solid rgba(44,24,16,.18)', color: 'rgba(44,24,16,.68)' }}>
          <ExternalLink size={11} /> Search flights
        </a>
      </div>
      <p className="font-hand mb-4" style={{ fontSize: 16, color: 'rgba(44,24,16,.68)' }}>updates as you plan ✏️</p>

      {/* Inputs */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label htmlFor="budget-total" className={labelCls}>Total budget (S$)</label>
          <input
            id="budget-total" type="number" min={0} placeholder="e.g. 4000"
            value={budget.total ?? ''}
            onChange={(e) => setBudget(trip.id, { total: e.target.value ? Number(e.target.value) : undefined })}
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="budget-flight" className={labelCls}>Flight / person, estimate (S$)</label>
          <input
            id="budget-flight" type="number" min={0} placeholder="e.g. 950"
            value={budget.flightPerPerson ?? ''}
            disabled={usingBooked}
            title={usingBooked ? 'Using your booked flight prices instead' : undefined}
            onChange={(e) => setBudget(trip.id, { flightPerPerson: e.target.value ? Number(e.target.value) : undefined })}
            className={cn(inputCls, 'disabled:opacity-50')}
          />
        </div>
      </div>

      <BookedFlights
        trip={trip}
        flights={booked}
        onChange={(next) => setBudget(trip.id, { flights: next })}
        inputCls={inputCls}
        labelCls={labelCls}
      />

      {/* Breakdown */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <BreakdownCell
          icon={<Plane size={11} />} label="Flights" value={formatSGD(flights)}
          sub={usingBooked
            ? `${pricedFlights.length} booked flight${pricedFlights.length > 1 ? 's' : ''}`
            : `${trip.paxCount} × ${formatSGD(budget.flightPerPerson ?? 0)} est.`}
        />
        <BreakdownCell icon={<BedDouble size={11} />} label="Stay" value={formatSGD(stay)} sub={`${nights} night${nights > 1 ? 's' : ''} × ${rooms} room${rooms > 1 ? 's' : ''}`} />
        <BreakdownCell icon={<UtensilsCrossed size={11} />} label="On the ground" value={formatSGD(onTheGround)} sub={`${aiDaily ? 'AI est.' : 'tier est.'} ${formatSGD(dailyPP)}/day pp`} />
      </div>

      {/* Projection bar */}
      <div className="rounded-xl border border-amber-200 bg-[#fffdf5] p-4">
        <div className="flex items-baseline justify-between mb-2 flex-wrap gap-1">
          <p className="text-sm">
            <span className="font-black text-[#2c1810] text-lg">{formatSGD(projected)}</span>
            <span className="text-[#7a5a40] text-xs"> projected{total > 0 ? ` of ${formatSGD(total)} budget` : ''}</span>
          </p>
          {total > 0 && (
            <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full border',
              over ? 'bg-red-50 text-red-700 border-red-200' : 'bg-[#c8dcc0]/50 text-[#3a6030] border-[#6b8f5e]/40')}>
              {over ? `${formatSGD(projected - total)} over` : `${formatSGD(total - projected)} under`} budget
            </span>
          )}
        </div>
        {total > 0 ? (
          <div className="h-3 rounded-full bg-amber-100 overflow-hidden" role="progressbar"
            aria-valuenow={Math.min(100, pct ?? 0)} aria-valuemin={0} aria-valuemax={100}>
            <motion.div
              className="h-full rounded-full"
              initial={false}
              animate={{ width: `${Math.min(100, pct ?? 0)}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
              style={{ background: over ? '#c94040' : pct && pct > 85 ? '#c9a84c' : '#6b8f5e' }}
            />
          </div>
        ) : (
          <p className="text-xs text-[#7a5a40]">Set a total budget to see how the plan tracks against it</p>
        )}
        <p className="text-[10px] text-[#7a5a40] mt-2">
          ≈ {formatSGD(projected / trip.paxCount)} per person · stay estimated at {formatSGD(NIGHT_RATE[trip.priceRange])}/night ({trip.priceRange} tier)
          {aiDaily ? ' · daily costs from your AI itinerary' : ' · generate an itinerary for sharper daily costs'}
        </p>
      </div>
    </div>
  )
}

/* ── Booked flights ── */

const LEG_LABEL: Record<BookedFlight['leg'], string> = { outbound: 'Outbound', return: 'Return', other: 'Other' }

const fmtWhen = (s: string) =>
  new Date(s).toLocaleString('en-SG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })

function BookedFlights({ trip, flights, onChange, inputCls, labelCls }: {
  trip: TripContext
  flights: BookedFlight[]
  onChange: (next: BookedFlight[]) => void
  inputCls: string
  labelCls: string
}) {
  // Sensible default leg: outbound first, then return
  const defaultLeg: BookedFlight['leg'] = flights.some((f) => f.leg === 'outbound') ? 'return' : 'outbound'
  const blank = () => ({
    leg: defaultLeg, flightNo: '', date: defaultLeg === 'return' ? trip.endDate : trip.startDate,
    from: '', to: '', departAt: '', arriveAt: '', price: '',
  })
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState(blank)
  const [looking, setLooking] = useState(false)
  const [error, setError] = useState('')
  const sorted = [...flights].sort((a, b) => a.departAt.localeCompare(b.departAt))
  const set = (k: keyof ReturnType<typeof blank>) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setDraft((d) => ({ ...d, [k]: e.target.value }))

  async function lookUp() {
    setLooking(true); setError('')
    try {
      const res = await fetch('/api/flight-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flightNo: draft.flightNo, date: draft.date }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Lookup failed')
      setDraft((d) => ({ ...d, flightNo: data.flightNo, from: data.from, to: data.to, departAt: data.departAt, arriveAt: data.arriveAt }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed')
    } finally {
      setLooking(false)
    }
  }

  function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (draft.arriveAt <= draft.departAt) { setError('Arrival must be after departure'); return }
    onChange([...flights, {
      id: generateId(),
      leg: draft.leg,
      flightNo: draft.flightNo.trim().toUpperCase(),
      from: draft.from.trim().toUpperCase(),
      to: draft.to.trim().toUpperCase(),
      departAt: draft.departAt,
      arriveAt: draft.arriveAt,
      price: draft.price.trim() ? Number(draft.price) : undefined,
    }])
    setError('')
    setAdding(false)
  }

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className={labelCls} style={{ marginBottom: 0 }}>Booked flights</span>
        {!adding && (
          <button type="button" onClick={() => { setDraft(blank()); setError(''); setAdding(true) }}
            className="flex items-center gap-1 text-xs font-semibold text-[#c94040] hover:text-[#a12f2f]">
            <Plus size={12} aria-hidden="true" /> Add a flight I booked
          </button>
        )}
      </div>

      {sorted.length === 0 && !adding && (
        <p className="text-xs text-[#7a5a40]">Already booked? Add your flights and the budget and itinerary will use the real times and fares.</p>
      )}

      <div className="space-y-2">
        {sorted.map((f) => (
          <div key={f.id} className="flex items-center gap-3 rounded-lg border border-amber-200 bg-white px-3 py-2">
            {f.leg === 'return'
              ? <PlaneLanding size={16} className="text-[#a86030] shrink-0" aria-hidden="true" />
              : <PlaneTakeoff size={16} className="text-[#a86030] shrink-0" aria-hidden="true" />}
            <div className="flex-1 min-w-0 text-xs">
              <p className="font-bold text-[#2c1810]">
                {f.flightNo || 'Flight'} · {f.from} → {f.to}
                <span className="ml-2 font-semibold text-[#7a5a40]">{LEG_LABEL[f.leg]}</span>
              </p>
              <p className="text-[#6b4a32]">{fmtWhen(f.departAt)} → {fmtWhen(f.arriveAt)}</p>
            </div>
            <span className="text-sm font-bold text-[#2c1810] whitespace-nowrap">{f.price != null ? formatSGD(f.price) : 'no price'}</span>
            <button type="button" onClick={() => onChange(flights.filter((x) => x.id !== f.id))}
              aria-label={`Remove flight ${f.flightNo}`} className="text-[#7a5a40] hover:text-[#c94040]">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {adding && (
        <form onSubmit={add} className="mt-2 rounded-xl border border-dashed border-amber-300 bg-[#fffdf5] p-3 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <div>
            <label htmlFor="fl-no" className={labelCls}>Flight no.</label>
            <input id="fl-no" value={draft.flightNo} onChange={set('flightNo')} placeholder="SQ638" className={inputCls} />
          </div>
          <div>
            <label htmlFor="fl-date" className={labelCls}>Departure date</label>
            <input id="fl-date" type="date" value={draft.date} onChange={set('date')} className={inputCls} />
          </div>
          <div className="flex items-end">
            <button type="button" onClick={lookUp} disabled={looking || draft.flightNo.trim().length < 3 || !draft.date}
              className="pill-ink pill-lift w-full rounded-full font-semibold text-xs py-2.5 disabled:opacity-50 flex items-center justify-center gap-1.5">
              {looking
                ? <span className="tc-spinner" style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff' }} />
                : <Search size={12} aria-hidden="true" />}
              Look up
            </button>
          </div>
          <div>
            <label htmlFor="fl-from" className={labelCls}>From</label>
            <input id="fl-from" value={draft.from} onChange={set('from')} required placeholder="SIN" className={inputCls} />
          </div>
          <div>
            <label htmlFor="fl-to" className={labelCls}>To</label>
            <input id="fl-to" value={draft.to} onChange={set('to')} required placeholder={trip.destination} className={inputCls} />
          </div>
          <div>
            <label htmlFor="fl-leg" className={labelCls}>Leg</label>
            <select id="fl-leg" value={draft.leg} onChange={set('leg')} className={inputCls}>
              <option value="outbound">Outbound</option>
              <option value="return">Return</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label htmlFor="fl-dep" className={labelCls}>Departs (local)</label>
            <input id="fl-dep" type="datetime-local" value={draft.departAt} onChange={set('departAt')} required className={inputCls} />
          </div>
          <div>
            <label htmlFor="fl-arr" className={labelCls}>Arrives (local)</label>
            <input id="fl-arr" type="datetime-local" value={draft.arriveAt} onChange={set('arriveAt')} required className={inputCls} />
          </div>
          <div>
            <label htmlFor="fl-price" className={labelCls}>Paid, all travellers (S$)</label>
            <input id="fl-price" type="number" min={0} value={draft.price} onChange={set('price')} placeholder="e.g. 1240" className={inputCls} />
          </div>
          <div className="col-span-2 sm:col-span-3 flex items-center justify-end gap-2">
            {error && <p role="alert" className="mr-auto text-xs text-red-700">{error}</p>}
            <button type="button" onClick={() => { setAdding(false); setError('') }} className="text-xs text-[#7a5a40] px-3 py-2">Cancel</button>
            <button type="submit" className="pill-coral pill-lift rounded-full font-bold text-xs px-4 py-2">Save flight</button>
          </div>
        </form>
      )}
    </div>
  )
}

function BreakdownCell({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-amber-100 bg-amber-50/50 px-2.5 py-2">
      <p className="text-[9px] font-black uppercase tracking-wide text-[#6b4a32] flex items-center gap-1">{icon} {label}</p>
      <p className="text-sm font-bold text-[#2c1810]">{value}</p>
      <p className="text-[9px] text-[#7a5a40]">{sub}</p>
    </div>
  )
}
