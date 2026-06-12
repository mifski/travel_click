'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, ExternalLink, Sparkles } from 'lucide-react'
import type { TripContext, AccommodationSuggestion } from '@/lib/types'
import { cn } from '@/lib/utils'

const TYPE_ICONS: Record<AccommodationSuggestion['type'], string> = {
  hotel: '🏨',
  hostel: '🛏️',
  villa: '🏡',
  ryokan: '⛩️',
  resort: '🌴',
  apartment: '🏢',
  boutique: '🏩',
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
    <div className="bg-white/80 backdrop-blur-sm border border-amber-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[#c94040]" />
          <h3 className="font-bold text-[#2c1810] text-sm">AI Accommodation Picks</h3>
        </div>
        <button
          onClick={fetchSuggestions}
          disabled={loading}
          className={cn(
            'px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all',
            loading
              ? 'bg-amber-100 text-amber-400 cursor-not-allowed'
              : fetched
              ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
              : 'text-white shadow-md hover:opacity-90'
          )}
          style={!loading && !fetched ? { background: 'linear-gradient(135deg, #c94040, #e05555)' } : {}}
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          {loading ? 'Finding…' : fetched ? 'Refresh' : 'Find Stays'}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 mb-3 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
      )}

      {suggestions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {suggestions.map((s, i) => {
            const priceBadge = PRICE_BADGE[s.priceTier]
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="bg-[#fffef9] border border-amber-200 rounded-xl p-4 hover:border-[#c94040]/40 hover:shadow-md transition-all shadow-sm"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{TYPE_ICONS[s.type]}</span>
                    <div>
                      <p className="font-bold text-[#2c1810] text-sm leading-tight">{s.name}</p>
                      <p className="text-xs text-amber-800/50 capitalize">{s.type}</p>
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

                <div className="flex items-center gap-1 text-[10px] text-amber-700/50 mb-3">
                  <Sparkles size={9} />
                  <span>AI-suggested</span>
                </div>

                <a
                  href={s.bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors w-full justify-center text-white hover:opacity-90"
                  style={{ background: '#6b8f5e' }}
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
        <p className="text-center text-amber-800/40 text-sm py-4">
          Click &ldquo;Find Stays&rdquo; to get AI-curated accommodation picks for your trip
        </p>
      )}
    </div>
  )
}
