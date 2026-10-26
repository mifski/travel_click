'use client'

import { useState } from 'react'
import type { TravelCard, PinPassport as Passport, GeneratedItinerary } from '@/lib/types'
import { useTripStore } from '@/lib/store'
import { Stamp, ExternalLink } from 'lucide-react'

const INK = '#2c1810'
const KIND: Record<Passport['kind'], { label: string; color: string }> = {
  classic: { label: 'CLASSIC', color: '#a86030' },
  'in-between': { label: 'IN BETWEEN', color: '#7e9ab5' },
  gem: { label: 'HIDDEN GEM', color: '#6b8f5e' },
}

/** Which itinerary day mentions this pin, matched on words from its name */
function plannedDay(card: TravelCard, itinerary: GeneratedItinerary | undefined): number | null {
  if (!itinerary) return null
  const tokens = (card.location.nameEnglish || card.title)
    .toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 3)
  if (!tokens.length) return null
  const day = itinerary.days.find((d) =>
    [...(d.morning ?? []), ...(d.afternoon ?? []), ...(d.evening ?? [])]
      .some((b) => tokens.some((t) => `${b.place} ${b.activity}`.toLowerCase().includes(t))))
  return day?.day ?? null
}

export function PinPassport({ card }: { card: TravelCard }) {
  const passport = useTripStore((s) => s.passports[card.tripId]?.[card.id])
  const itinerary = useTripStore((s) => s.itineraries[card.tripId])
  const savePassport = useTripStore((s) => s.savePassport)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const day = plannedDay(card, itinerary)

  async function stamp() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/pin-passport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId: card.id,
          place: card.location.nameEnglish || card.title,
          where: [card.location.city, card.location.country].filter(Boolean).join(', '),
          note: card.description,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to stamp passport')
      savePassport(card.tripId, data.passport as Passport)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stamp passport')
    } finally {
      setLoading(false)
    }
  }

  const dayLine = itinerary
    ? day ? `On your itinerary: Day ${day}` : 'Not on your itinerary yet'
    : null

  if (!passport) {
    return (
      <div className="mb-4 flex items-center justify-between gap-3" style={{ padding: '10px 14px', border: '1px dashed rgba(44,24,16,.25)', borderRadius: 10 }}>
        <div>
          <p className="font-bold m-0" style={{ fontSize: 12, color: INK }}>Pin passport</p>
          <p className="m-0" style={{ fontSize: 11, color: 'rgba(44,24,16,.6)' }}>
            {error || dayLine || 'Hours, price, best time and how to get in'}
          </p>
        </div>
        <button
          onClick={stamp}
          disabled={loading}
          className="pill-coral pill-lift shrink-0 inline-flex items-center gap-1.5 rounded-full font-semibold disabled:opacity-60"
          style={{ padding: '7px 14px', fontSize: 12 }}
        >
          <Stamp size={13} aria-hidden="true" />
          {loading ? 'Stamping…' : 'Stamp it'}
        </button>
      </div>
    )
  }

  const kind = KIND[passport.kind]
  const rows: [string, string][] = [
    ['Hours', passport.hours],
    ['Best time', passport.bestTime],
    ['Time needed', passport.timeNeeded],
    ['Price', passport.price],
    ['Getting in', passport.booking],
  ]
  return (
    <div className="mb-4 relative" style={{ padding: '14px 16px', border: `1.5px solid ${kind.color}55`, borderRadius: 10, background: `${kind.color}0d` }}>
      <span
        className="absolute font-extrabold"
        style={{
          top: 10, right: 12, fontSize: 9.5, letterSpacing: '.14em', color: kind.color,
          border: `2px solid ${kind.color}`, borderRadius: 6, padding: '3px 7px', transform: 'rotate(-6deg)',
        }}
      >
        {kind.label}
      </span>
      <p className="font-extrabold m-0" style={{ fontSize: 9.5, letterSpacing: '.2em', color: 'rgba(44,24,16,.55)' }}>PIN PASSPORT</p>
      {dayLine && <p className="m-0 font-semibold" style={{ fontSize: 11.5, color: day ? '#6b8f5e' : 'rgba(44,24,16,.6)', marginTop: 2 }}>{dayLine}</p>}
      <dl className="grid m-0" style={{ gridTemplateColumns: 'auto 1fr', gap: '5px 12px', marginTop: 10, fontSize: 12 }}>
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="font-bold" style={{ color: 'rgba(44,24,16,.55)' }}>{k}</dt>
            <dd className="m-0" style={{ color: INK }}>{v}</dd>
          </div>
        ))}
      </dl>
      {passport.tip && <p className="font-hand m-0" style={{ fontSize: 17, color: INK, marginTop: 8 }}>{passport.tip}</p>}
      <div className="flex items-center justify-between" style={{ marginTop: 8, fontSize: 10.5, color: 'rgba(44,24,16,.5)' }}>
        <span>
          AI-sourced, stamped {passport.stampedAt.slice(0, 10)}. Check before you go.
          {passport.sourceUrl && (
            <a href={passport.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 ml-1.5 underline">
              Official site <ExternalLink size={9} />
            </a>
          )}
        </span>
        <button onClick={stamp} disabled={loading} className="underline disabled:opacity-50 shrink-0 ml-2">
          {loading ? 'Re-stamping…' : 'Re-stamp'}
        </button>
      </div>
      {error && <p className="m-0" style={{ fontSize: 11, color: '#c94040', marginTop: 4 }}>{error}</p>}
    </div>
  )
}
