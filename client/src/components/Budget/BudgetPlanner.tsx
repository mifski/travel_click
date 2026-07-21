'use client'

import { motion } from 'framer-motion'
import { ExternalLink, Plane, BedDouble, UtensilsCrossed } from 'lucide-react'
import type { TripContext, PriceRange } from '@/lib/types'
import { useTripStore } from '@/lib/store'
import { getDayCount, googleFlightsUrl, cn } from '@/lib/utils'

/** Mid-point assumptions per price tier (USD) when no better signal exists */
const NIGHT_RATE: Record<PriceRange, number> = { budget: 55, mid: 150, luxury: 380 }
const DAILY_PP: Record<PriceRange, number> = { budget: 45, mid: 85, luxury: 170 }

/** Pull a per-person-per-day midpoint out of strings like "~$95–130 per person / day" */
function parseDailyCost(s?: string): number | null {
  if (!s) return null
  const nums = s.match(/\d+/g)?.map(Number).filter((n) => n > 5 && n < 1000)
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

  const flights = (budget.flightPerPerson ?? 0) * trip.paxCount
  const stay = nights * rooms * NIGHT_RATE[trip.priceRange]
  const onTheGround = dailyPP * days * trip.paxCount
  const projected = flights + stay + onTheGround

  const total = budget.total ?? 0
  const pct = total > 0 ? Math.min(150, Math.round((projected / total) * 100)) : null
  const over = total > 0 && projected > total

  const fmt = (n: number) => '$' + n.toLocaleString('en-US')

  const inputCls = 'w-full bg-amber-50/60 border border-amber-200 rounded-xl px-3 py-2 text-sm text-[#2c1810] placeholder-amber-700/35 focus:outline-none focus:border-[#c9a84c] focus:bg-white transition-colors'

  return (
    <div>
      <div className="flex items-center justify-between mb-1 gap-3 flex-wrap">
        <span className="uppercase font-semibold" style={{ fontSize: 11, letterSpacing: '.18em', color: '#c9a84c' }}>
          Projected total vs your budget
        </span>
        <a href={googleFlightsUrl(trip.destination, trip.startDate)} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-full text-xs font-semibold transition-colors hover:text-[#2c1810]"
          style={{ padding: '7px 14px', border: '1px solid rgba(44,24,16,.18)', color: 'rgba(44,24,16,.6)' }}>
          <ExternalLink size={11} /> Search flights
        </a>
      </div>
      <p className="font-hand mb-4" style={{ fontSize: 16, color: 'rgba(44,24,16,.5)' }}>updates as you plan ✏️</p>

      {/* Inputs */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-[10px] font-black uppercase tracking-wide text-amber-700/60 mb-1 block">Total budget (USD)</label>
          <input
            type="number" min={0} placeholder="e.g. 3000"
            value={budget.total ?? ''}
            onChange={(e) => setBudget(trip.id, { total: e.target.value ? Number(e.target.value) : undefined })}
            className={inputCls}
          />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-wide text-amber-700/60 mb-1 block">Flight / person (USD)</label>
          <input
            type="number" min={0} placeholder="e.g. 700"
            value={budget.flightPerPerson ?? ''}
            onChange={(e) => setBudget(trip.id, { flightPerPerson: e.target.value ? Number(e.target.value) : undefined })}
            className={inputCls}
          />
        </div>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <BreakdownCell icon={<Plane size={11} />} label="Flights" value={fmt(flights)} sub={`${trip.paxCount} × ${fmt(budget.flightPerPerson ?? 0)}`} />
        <BreakdownCell icon={<BedDouble size={11} />} label="Stay" value={fmt(stay)} sub={`${nights} night${nights > 1 ? 's' : ''} × ${rooms} room${rooms > 1 ? 's' : ''}`} />
        <BreakdownCell icon={<UtensilsCrossed size={11} />} label="On the ground" value={fmt(onTheGround)} sub={`${aiDaily ? 'AI est.' : 'tier est.'} $${dailyPP}/day pp`} />
      </div>

      {/* Projection bar */}
      <div className="rounded-xl border border-amber-200 bg-[#fffdf5] p-4">
        <div className="flex items-baseline justify-between mb-2 flex-wrap gap-1">
          <p className="text-sm">
            <span className="font-black text-[#2c1810] text-lg">{fmt(projected)}</span>
            <span className="text-amber-800/50 text-xs"> projected{total > 0 ? ` of ${fmt(total)} budget` : ''}</span>
          </p>
          {total > 0 && (
            <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full border',
              over ? 'bg-red-50 text-red-700 border-red-200' : 'bg-[#c8dcc0]/50 text-[#3a6030] border-[#6b8f5e]/40')}>
              {over ? `${fmt(projected - total)} over` : `${fmt(total - projected)} under`} budget
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
          <p className="text-xs text-amber-800/40">Set a total budget to see how the plan tracks against it</p>
        )}
        <p className="text-[10px] text-amber-700/45 mt-2">
          ≈ {fmt(Math.round(projected / trip.paxCount))} per person · stay estimated at ${NIGHT_RATE[trip.priceRange]}/night ({trip.priceRange} tier)
          {aiDaily ? ' · daily costs from your AI itinerary' : ' · generate an itinerary for sharper daily costs'}
        </p>
      </div>
    </div>
  )
}

function BreakdownCell({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-amber-100 bg-amber-50/50 px-2.5 py-2">
      <p className="text-[9px] font-black uppercase tracking-wide text-amber-700/60 flex items-center gap-1">{icon} {label}</p>
      <p className="text-sm font-bold text-[#2c1810]">{value}</p>
      <p className="text-[9px] text-amber-700/50">{sub}</p>
    </div>
  )
}
