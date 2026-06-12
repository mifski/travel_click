'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { GeneratedItinerary, ItineraryDay, ItineraryTimeBlock } from '@/lib/types'
import { cn, googleMapsUrl } from '@/lib/utils'
import { Clock, MapPin, Utensils, Navigation, Info, Sparkles, ExternalLink, Wallet } from 'lucide-react'

/* ── Per-category styling ── */
const CAT: Record<ItineraryTimeBlock['category'], {
  Icon: React.ElementType; dot: string; bg: string; border: string; label: string; accent: string
}> = {
  activity:  { Icon: MapPin,      dot: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', label: 'Activity', accent: '#3b82f6' },
  meal:      { Icon: Utensils,    dot: '#f97316', bg: '#fff7ed', border: '#fed7aa', label: 'Meal',     accent: '#f97316' },
  transport: { Icon: Navigation,  dot: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0', label: 'Transit',  accent: '#94a3b8' },
  rest:      { Icon: Clock,       dot: '#10b981', bg: '#f0fdf4', border: '#bbf7d0', label: 'Rest',     accent: '#10b981' },
}

/* Cycling palette for day tabs — inspired by moodboard */
const DAY_COLORS = ['#c94040','#e07040','#6b8f5e','#7e9ab5','#9b72bf','#c98040','#3a7a7a','#c94080']

const MEAL_INFO = {
  breakfast: { icon: '🌅', label: 'Breakfast', bg: '#fff7ed', border: '#fed7aa', text: '#9a3412' },
  lunch:     { icon: '☀️', label: 'Lunch',     bg: '#fefce8', border: '#fde68a', text: '#713f12' },
  dinner:    { icon: '🌙', label: 'Dinner',    bg: '#f5f3ff', border: '#ddd6fe', text: '#4c1d95' },
}

/* ── Single activity row ── */
function TimeBlock({ block, destination }: { block: ItineraryTimeBlock; destination: string }) {
  const c = CAT[block.category] ?? CAT.activity
  return (
    <div
      className="flex gap-3 p-3 rounded-xl border mb-2 last:mb-0 hover:shadow-sm transition-shadow group"
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
          title="Open in Google Maps"
          className="inline-flex items-center gap-1 mt-0.5 rounded hover:underline decoration-amber-400 underline-offset-2"
        >
          <MapPin size={9} className="text-amber-600 shrink-0" />
          <span className="text-[11px] text-amber-800 truncate">{block.place}</span>
          <ExternalLink size={8} className="text-amber-500 opacity-0 group-hover:opacity-70 transition-opacity shrink-0 print:hidden" />
        </a>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="text-[10px] text-slate-500">⏱ {block.duration}</span>
          {block.bookingRequired && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' }}>
              Book ahead
            </span>
          )}
        </div>
        {block.notes && (
          <p className="text-[11px] text-slate-500 mt-1 italic">{block.notes}</p>
        )}
      </div>
    </div>
  )
}

/* ── Period divider ── */
function PeriodLabel({ icon, title, color }: { icon: string; title: string; color: string }) {
  return (
    <div className="flex items-center gap-2 mt-5 mb-2 first:mt-0">
      <span className="text-sm">{icon}</span>
      <span className="text-[10px] font-black uppercase tracking-[0.15em]" style={{ color }}>{title}</span>
      <div className="flex-1 h-px" style={{ background: `${color}40` }} />
    </div>
  )
}

/* ── Full day page (shared between binder + print view) ── */
export function DayPage({ day, accentColor, destination }: { day: ItineraryDay; accentColor: string; destination: string }) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="min-h-full p-6 paper-texture" style={{ background: 'linear-gradient(180deg, #fffef9 0%, #fdf9f0 100%)' }}>

        {/* ── DAY header (travel-journal style) ── */}
        <div className="mb-6 pb-5 border-b-2" style={{ borderColor: `${accentColor}30` }}>
          <div className="flex items-start gap-4">
            {/* Bold day block */}
            <div className="shrink-0 text-right">
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: accentColor }}>Day</p>
              <p className="text-5xl font-black leading-none" style={{ color: accentColor, fontFamily: 'var(--font-playfair, Georgia, serif)' }}>
                {String(day.day).padStart(2, '0')}
              </p>
            </div>
            <div className="flex-1 pt-1">
              <h2 className="font-bold text-xl text-[#1a0f00] leading-tight" style={{ fontFamily: 'var(--font-playfair, Georgia, serif)' }}>
                {day.theme}
              </h2>
              <p className="text-xs text-amber-700/60 font-mono mt-0.5">{day.date}</p>
              {day.estimatedCost && (
                <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border"
                  style={{ color: accentColor, borderColor: `${accentColor}50`, background: `${accentColor}0d` }}>
                  <Wallet size={9} />
                  {day.estimatedCost}
                </span>
              )}
            </div>
            <div className="stamp shrink-0 mt-1" style={{ color: accentColor }}>
              Day {day.day}
            </div>
          </div>

          {/* Meals row */}
          {day.meals && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {(['breakfast', 'lunch', 'dinner'] as const).map((m) => {
                const info = MEAL_INFO[m]
                return day.meals[m] ? (
                  <div key={m} className="rounded-xl px-2.5 py-2 border" style={{ background: info.bg, borderColor: info.border }}>
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className="text-xs">{info.icon}</span>
                      <span className="text-[8px] font-black uppercase tracking-wide" style={{ color: info.text }}>{info.label}</span>
                    </div>
                    <p className="text-[10px] font-semibold leading-tight" style={{ color: info.text }}>{day.meals[m]}</p>
                  </div>
                ) : null
              })}
            </div>
          )}
        </div>

        {/* ── Activity blocks ── */}
        {day.morning?.length > 0 && (
          <>
            <PeriodLabel icon="☀️" title="Morning" color="#e07040" />
            {day.morning.map((b, i) => <TimeBlock key={i} block={b} destination={destination} />)}
          </>
        )}
        {day.afternoon?.length > 0 && (
          <>
            <PeriodLabel icon="🌤️" title="Afternoon" color="#c9a020" />
            {day.afternoon.map((b, i) => <TimeBlock key={i} block={b} destination={destination} />)}
          </>
        )}
        {day.evening?.length > 0 && (
          <>
            <PeriodLabel icon="🌙" title="Evening" color="#7e6bb5" />
            {day.evening.map((b, i) => <TimeBlock key={i} block={b} destination={destination} />)}
          </>
        )}

        {/* ── Tips ── */}
        {day.travelTips?.length > 0 && (
          <div className="mt-5 p-4 rounded-xl border border-[#c0d4e8] bg-[#eff6ff]">
            <div className="flex items-center gap-2 mb-2">
              <Info size={12} className="text-[#7e9ab5]" />
              <p className="text-[10px] font-black uppercase tracking-widest text-[#3a5f7a]">Tips for today</p>
            </div>
            {day.travelTips.map((tip, i) => (
              <p key={i} className="text-xs text-[#3a5f7a] leading-relaxed mb-1">• {tip}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export { DAY_COLORS }

/* ── Main binder component ── */
interface Props { itinerary: GeneratedItinerary }

export function ItineraryBinder({ itinerary }: Props) {
  const [activeDay, setActiveDay] = useState(0)
  const [direction, setDirection] = useState(0)

  function goToDay(idx: number) {
    setDirection(idx > activeDay ? 1 : -1)
    setActiveDay(idx)
  }

  const pageVariants = {
    enter: (d: number) => ({ x: d > 0 ? '55%' : '-55%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? '-35%' : '35%', opacity: 0 }),
  }

  const activeColor = DAY_COLORS[activeDay % DAY_COLORS.length]

  return (
    <div className="flex flex-col flex-1 min-h-0 rounded-2xl overflow-hidden border border-amber-200 shadow-lg">

      {/* ── Binder spine / cover ── */}
      <div className="px-6 py-5" style={{ background: 'linear-gradient(135deg, #78350f 0%, #92400e 60%, #78350f 100%)' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-amber-300/60 text-[10px] uppercase tracking-widest font-bold mb-0.5">Trip Itinerary</p>
            <h2
              className="text-white font-bold text-2xl leading-tight"
              style={{ fontFamily: 'var(--font-playfair, Georgia, serif)' }}
            >
              {itinerary.destination}
            </h2>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }}>
              <Sparkles size={12} className="text-amber-300" />
              <span className="text-[11px] text-amber-200 font-semibold">AI-generated</span>
            </div>
            {itinerary.totalEstimatedCost && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }}>
                <Wallet size={11} className="text-amber-300" />
                <span className="text-[11px] text-amber-200 font-semibold">{itinerary.totalEstimatedCost}</span>
              </div>
            )}
          </div>
        </div>
        <p className="text-amber-100/55 text-xs mt-2.5 leading-relaxed line-clamp-2">{itinerary.overview}</p>
      </div>

      {/* Rings */}
      <div className="flex items-center justify-around px-8 py-2.5" style={{ background: '#3b2010' }}>
        {Array.from({ length: 7 }).map((_, i) => <div key={i} className="binder-ring" />)}
      </div>

      {/* ── Day tabs ── */}
      <div className="flex overflow-x-auto gap-0 px-2 pt-2.5 shrink-0" style={{ background: '#f0e4c8' }}>
        {itinerary.days.map((day, i) => {
          const color = DAY_COLORS[i % DAY_COLORS.length]
          const isActive = activeDay === i
          return (
            <button
              key={i}
              onClick={() => goToDay(i)}
              className={cn('day-tab shrink-0 transition-all', isActive ? 'text-white shadow-md' : 'text-amber-700/60 hover:text-amber-800')}
              style={isActive
                ? { background: color, borderColor: `${color}80` }
                : { background: '#e8d5b0', borderColor: '#c8a870' }
              }
            >
              <span className="block text-[9px] opacity-70 font-semibold">DAY</span>
              <span className="font-black">{String(day.day).padStart(2, '0')}</span>
            </button>
          )
        })}
      </div>

      {/* ── Page content ── */}
      <div className="flex-1 relative overflow-hidden min-h-[420px]" style={{ background: '#fffef9', perspective: '800px' }}>
        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={activeDay}
            custom={direction}
            variants={pageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="absolute inset-0"
          >
            <DayPage day={itinerary.days[activeDay]} accentColor={activeColor} destination={itinerary.destination} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Navigation ── */}
      <div className="flex justify-between items-center px-6 py-3 border-t" style={{ background: '#f0e4c8', borderColor: '#d4b88a' }}>
        <button
          onClick={() => activeDay > 0 && goToDay(activeDay - 1)}
          disabled={activeDay === 0}
          className="px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-30 transition-all hover:opacity-90"
          style={{ background: DAY_COLORS[(activeDay - 1 + DAY_COLORS.length) % DAY_COLORS.length] }}
        >
          ← Previous
        </button>
        <div className="flex items-center gap-2">
          {itinerary.days.map((_, i) => (
            <button
              key={i}
              onClick={() => goToDay(i)}
              aria-label={`Go to day ${i + 1}`}
              className="w-2 h-2 rounded-full transition-all"
              style={{ background: i === activeDay ? activeColor : '#c8a870', transform: i === activeDay ? 'scale(1.4)' : 'scale(1)' }}
            />
          ))}
        </div>
        <button
          onClick={() => activeDay < itinerary.days.length - 1 && goToDay(activeDay + 1)}
          disabled={activeDay === itinerary.days.length - 1}
          className="px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-30 transition-all hover:opacity-90"
          style={{ background: DAY_COLORS[(activeDay + 1) % DAY_COLORS.length] }}
        >
          Next →
        </button>
      </div>
    </div>
  )
}
