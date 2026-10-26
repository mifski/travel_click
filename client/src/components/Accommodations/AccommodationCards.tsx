'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, ExternalLink, Sparkles, Hotel, BedDouble, House, Landmark, TreePalm, Building2, Gem, Plus, X, type LucideIcon } from 'lucide-react'
import type { TripContext, AccommodationSuggestion } from '@/lib/types'
import { cn, formatDate } from '@/lib/utils'
import { useTripStore } from '@/lib/store'

const EMPTY: AccommodationSuggestion[] = []

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

/** Where the travellers are actually sleeping. The itinerary plans each day from that night's stay */
function YourStays({ trip, prefill, onPrefilled }: { trip: TripContext; prefill: string; onPrefilled: () => void }) {
  const booked = useTripStore((s) => s.stays[trip.id]?.booked) ?? []
  const addStay = useTripStore((s) => s.addStay)
  const removeStay = useTripStore((s) => s.removeStay)
  const last = booked[booked.length - 1]
  const [open, setOpen] = useState(booked.length === 0)
  const [error, setError] = useState('')

  const input = 'w-full focus:outline-none'
  const inputStyle: React.CSSProperties = { padding: '9px 12px', border: '1.5px solid rgba(44,24,16,.16)', borderRadius: 10, background: '#fff', fontSize: 13, color: '#2c1810' }

  return (
    <section id="your-stays" style={{ marginBottom: 22, scrollMarginTop: 16 }}>
      <div className="flex items-center justify-between gap-3" style={{ marginBottom: 10 }}>
        <h3 className="font-display m-0" style={{ fontWeight: 800, fontSize: 18, color: '#2c1810' }}>Where you&rsquo;re staying</h3>
        {!open && (
          <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1 font-semibold hover:text-[#c94040]" style={{ fontSize: 12.5, color: '#6b4a32' }}>
            <Plus size={13} aria-hidden="true" /> Add a stay
          </button>
        )}
      </div>
      <p className="m-0" style={{ fontSize: 12, color: '#7a5a40', marginBottom: 10 }}>
        Each day of your itinerary starts and ends here, with routes from the nearest station. Add one per hotel if you move around.
      </p>

      {booked.length > 0 && (
        <ul className="m-0 p-0 list-none flex flex-col gap-2" style={{ marginBottom: 10 }}>
          {booked.map((b) => (
            <li key={b.id} className="flex items-center gap-3" style={{ padding: '10px 12px', background: '#faf6f0', border: '1px solid rgba(44,24,16,.1)', borderRadius: 10 }}>
              <BedDouble size={16} className="text-[#a86030] shrink-0" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className="m-0 font-bold truncate" style={{ fontSize: 13, color: '#2c1810' }}>{b.name}</p>
                <p className="m-0" style={{ fontSize: 11.5, color: '#7a5a40' }}>
                  {formatDate(b.checkIn)} to {formatDate(b.checkOut)}{b.area ? `, near ${b.area}` : ''}
                </p>
              </div>
              <button onClick={() => removeStay(trip.id, b.id)} aria-label={`Remove ${b.name}`} className="p-2 rounded-full hover:bg-black/5" style={{ color: '#7a5a40' }}>
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {(open || prefill) && (
        <form
          key={prefill || 'blank'}
          className="grid gap-2 sm:grid-cols-2"
          style={{ padding: 12, border: '1.5px dashed rgba(44,24,16,.18)', borderRadius: 12 }}
          onSubmit={(e) => {
            e.preventDefault()
            const f = new FormData(e.currentTarget)
            const name = String(f.get('name') ?? '').trim()
            const checkIn = String(f.get('checkIn') ?? '')
            const checkOut = String(f.get('checkOut') ?? '')
            if (!name) { setError('Add the hotel or address.'); return }
            if (!checkIn || !checkOut || checkOut <= checkIn) { setError('Check-out needs to be after check-in.'); return }
            addStay(trip.id, { name, area: String(f.get('area') ?? '').trim() || undefined, checkIn, checkOut })
            setError('')
            setOpen(false)
            onPrefilled()
          }}
        >
          <label className="sm:col-span-2" style={{ fontSize: 11.5, color: '#6b4a32' }}>
            Hotel or address
            <input name="name" defaultValue={prefill} placeholder="e.g. Hotel Gracery Shinjuku" className={input} style={{ ...inputStyle, marginTop: 4 }} />
          </label>
          <label className="sm:col-span-2" style={{ fontSize: 11.5, color: '#6b4a32' }}>
            Area or nearest station (optional)
            <input name="area" placeholder="e.g. Shinjuku Station" className={input} style={{ ...inputStyle, marginTop: 4 }} />
          </label>
          <label style={{ fontSize: 11.5, color: '#6b4a32' }}>
            Check-in
            <input type="date" name="checkIn" defaultValue={last?.checkOut ?? trip.startDate} min={trip.startDate} max={trip.endDate} className={input} style={{ ...inputStyle, marginTop: 4 }} />
          </label>
          <label style={{ fontSize: 11.5, color: '#6b4a32' }}>
            Check-out
            <input type="date" name="checkOut" defaultValue={trip.endDate} min={trip.startDate} max={trip.endDate} className={input} style={{ ...inputStyle, marginTop: 4 }} />
          </label>
          {error && <p className="sm:col-span-2 m-0" role="alert" style={{ fontSize: 12, color: '#a12f2f' }}>{error}</p>}
          <div className="sm:col-span-2 flex justify-end gap-2" style={{ marginTop: 4 }}>
            {booked.length > 0 && (
              <button type="button" onClick={() => { setOpen(false); setError(''); onPrefilled() }} className="rounded-full" style={{ padding: '9px 16px', fontSize: 12.5, color: '#6b4a32' }}>
                Cancel
              </button>
            )}
            <button type="submit" className="pill-coral pill-lift rounded-full font-semibold" style={{ padding: '9px 18px', fontSize: 12.5 }}>
              Save stay
            </button>
          </div>
        </form>
      )}
    </section>
  )
}

export function AccommodationCards({ trip }: Props) {
  // AI picks live in the store, so they're saved to the account and survive closing the panel
  const suggestions = useTripStore((s) => s.stays[trip.id]?.suggestions) ?? EMPTY
  const saveStaySuggestions = useTripStore((s) => s.saveStaySuggestions)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [prefill, setPrefill] = useState('')
  const fetched = suggestions.length > 0

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
      saveStaySuggestions(trip.id, data.suggestions)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load suggestions')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <YourStays trip={trip} prefill={prefill} onPrefilled={() => setPrefill('')} />

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

                <button
                  type="button"
                  onClick={() => { setPrefill(s.name); document.getElementById('your-stays')?.scrollIntoView({ behavior: 'smooth' }) }}
                  className="pill-paper pill-lift flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold w-full justify-center mb-2"
                >
                  <BedDouble size={11} aria-hidden="true" /> I&rsquo;m staying here
                </button>

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
