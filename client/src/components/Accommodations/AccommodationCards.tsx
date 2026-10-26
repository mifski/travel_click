'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, ExternalLink, Sparkles, Hotel, BedDouble, House, Landmark, TreePalm, Building2, Gem, type LucideIcon } from 'lucide-react'
import type { TripContext, AccommodationSuggestion } from '@/lib/types'
import { cn } from '@/lib/utils'

const TYPE_ICONS: Record<AccommodationSuggestion['type'], LucideIcon> = {
  hotel: Hotel,
  hostel: BedDouble,
  villa: House,
  ryokan: Landmark,
  resort: TreePalm,
  apartment: Building2,
  boutique: Gem,
}

const PRICE_BADGE: Record<string, { label: string; cls: string }> = {
  budget: { label: 'Budget',    cls: 'bg-[#c8dcc0]/60 text-[#3a6030] border-[#6b8f5e]/40' },
  mid:    { label: 'Mid-range', cls: 'bg-[#c0d4e8]/60 text-[#3a5f7a] border-[#7e9ab5]/40' },
  luxury: { label: 'Luxury',    cls: 'bg-[#e8d8f4]/70 text-[#5f3a7a] border-[#9b72bf]/40' },
}

interface Props {
  trip: TripContext
}

export function AccommodationCards({ trip }: Props) {
  const [suggestions, setSuggestions] = useState<AccommodationSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fetched, setFetched] = useState(false)

  async function fetchSuggestions() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/accommodations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSuggestions(data.suggestions)
      setFetched(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load suggestions')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3">
        <span className="uppercase font-semibold" style={{ fontSize: 11, letterSpacing: '.18em', color: '#c94040' }}>
          AI-curated picks for {trip.destination}
        </span>
        <button
          onClick={fetchSuggestions}
          disabled={loading}
          className={cn(
            'rounded-full text-sm font-semibold flex items-center gap-2 disabled:opacity-60',
            fetched && !loading ? 'transition-colors hover:text-[#2c1810]' : 'pill-coral pill-lift'
          )}
          style={fetched && !loading
            ? { padding: '9px 18px', border: '1px solid rgba(44,24,16,.18)', color: 'rgba(44,24,16,.68)' }
            : { padding: '9px 18px' }}
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          {loading ? 'Finding…' : fetched ? '↻ Refresh' : '✦ Find stays'}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 mb-3 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
      )}

      {suggestions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {suggestions.map((s, i) => {
            const priceBadge = PRICE_BADGE[s.priceTier]
            const TypeIcon = TYPE_ICONS[s.type] ?? Hotel // AI may return a type outside the union
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="p-4 transition-all hover:-translate-y-0.5"
                style={{ background: '#faf6f0', border: '1px solid rgba(44,24,16,.1)', borderRadius: 12 }}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <TypeIcon size={20} strokeWidth={1.75} className="text-[#a86030] shrink-0" aria-hidden="true" />
                    <div>
                      <p className="font-bold text-[#2c1810] text-sm leading-tight">{s.name}</p>
                      <p className="text-xs text-[#7a5a40] capitalize">{s.type}</p>
                    </div>
                  </div>
                  <span className={cn('text-[10px] px-2 py-1 rounded-full border font-bold shrink-0', priceBadge?.cls)}>
                    {priceBadge?.label}
                  </span>
                </div>

                <p className="text-xs text-[#c94040] font-bold mb-2">{s.estimatedPricePerNight}/night</p>

                <p className="text-xs text-[#3a2a10]/80 leading-relaxed mb-3">{s.whyItFits}</p>

                <div className="flex flex-wrap gap-1 mb-3">
                  {s.highlights.map((h) => (
                    <span key={h} className="text-[10px] px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-full text-amber-800">
                      {h}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-1 text-[10px] text-[#7a5a40] mb-3">
                  <Sparkles size={9} />
                  <span>AI-suggested</span>
                </div>

                <a
                  href={s.bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pill-lift flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold w-full justify-center text-white"
                  style={{ background: '#6b8f5e', boxShadow: '0 2px 0 #557a49' }}
                >
                  <ExternalLink size={11} />
                  Search on Booking.com
                </a>
              </motion.div>
            )
          })}
        </div>
      )}

      {!fetched && !loading && (
        <p className="text-center text-[#7a5a40] text-sm py-4">
          Click &ldquo;Find Stays&rdquo; to get AI-curated accommodation picks for your trip
        </p>
      )}
    </div>
  )
}
