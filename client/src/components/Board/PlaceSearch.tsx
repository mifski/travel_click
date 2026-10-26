'use client'

import { useEffect, useRef, useState } from 'react'
import { Search, Check, MapPin } from 'lucide-react'
import { useTripStore } from '@/lib/store'
import { toast } from '@/components/UI/Toaster'
import type { PlaceCandidate } from '@/lib/place-search'
import { samePlace } from '@/lib/place-match'

/** Type a place ("USJ", "Ichiran Shibuya"), see matches with photos, pin with one tap */
export function PlaceSearch({ tripId }: { tripId: string }) {
  const trip = useTripStore((s) => s.trips.find((t) => t.id === tripId))
  const addCard = useTripStore((s) => s.addCard)
  const board = useTripStore((s) => s.cards[tripId]) ?? []
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PlaceCandidate[] | null>(null)
  const [pinned, setPinned] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 60)
    return () => clearTimeout(t)
  }, [])

  async function search(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim().length < 2 || loading) return
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/place-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), destination: trip?.destination, country: trip?.country }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Search failed')
      setResults(data.places ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  function pin(p: PlaceCandidate) {
    addCard(tripId, p)
    setPinned((s) => new Set(s).add(p.title))
    toast.success(`Pinned ${p.title}`)
  }

  return (
    <div>
      <form onSubmit={search} className="flex gap-2">
        <label htmlFor="place-q" className="sr-only">Place name</label>
        <input
          id="place-q"
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`e.g. USJ, Ichiran ramen${trip?.destination ? `, a café in ${trip.destination}` : ''}`}
          className="flex-1 min-w-0 focus:outline-none"
          style={{ padding: '12px 14px', border: '1.5px solid rgba(44,24,16,.18)', borderRadius: 10, background: '#faf6f0', fontSize: 13, color: '#2c1810' }}
        />
        <button
          type="submit"
          disabled={loading || query.trim().length < 2}
          className="pill-coral pill-lift rounded-full font-semibold disabled:opacity-50 flex items-center gap-1.5 shrink-0"
          style={{ padding: '10px 18px', fontSize: 12.5 }}
        >
          {loading
            ? <span className="tc-spinner" style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff' }} />
            : <Search size={14} aria-hidden="true" />}
          Search
        </button>
      </form>

      {error && <p role="alert" style={{ marginTop: 12, fontSize: 12, color: '#a12f2f' }}>{error}</p>}

      {results && !loading && (
        <div className="space-y-2.5" style={{ marginTop: 14, maxHeight: 360, overflowY: 'auto' }}>
          {results.length === 0 && (
            <p style={{ fontSize: 12.5, color: '#7a5a40' }}>No match. Try the full name, or add the city.</p>
          )}
          {results.map((p) => {
            const done = pinned.has(p.title) || board.some((c) => samePlace(p, c))
            return (
              <div key={p.title} className="flex gap-3 items-start rounded-xl border border-amber-200 bg-white p-2.5">
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageUrl} alt="" className="shrink-0 object-cover rounded-lg" style={{ width: 64, height: 64 }} />
                ) : (
                  <div className="shrink-0 rounded-lg flex items-center justify-center bg-amber-50" style={{ width: 64, height: 64 }}>
                    <MapPin size={20} className="text-[#a86030]" aria-hidden="true" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-display" style={{ fontWeight: 700, fontSize: 15, color: '#2c1810', lineHeight: 1.2 }}>{p.title}</p>
                  <p style={{ fontSize: 11, color: '#7a5a40', marginTop: 2 }}>
                    {[p.location.nameLocal, p.location.city, p.location.country].filter(Boolean).join(' · ')}
                  </p>
                  <p className="line-clamp-2" style={{ fontSize: 11.5, color: '#6b4a32', marginTop: 4, lineHeight: 1.45 }}>{p.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => pin(p)}
                  disabled={done}
                  aria-label={done ? `${p.title} is on your board` : `Pin ${p.title}`}
                  className={done ? 'shrink-0 rounded-full flex items-center gap-1 font-semibold' : 'pill-coral pill-lift shrink-0 rounded-full font-semibold'}
                  style={{ padding: '7px 14px', fontSize: 12, ...(done ? { color: '#3a6030', background: '#c8dcc0' } : {}) }}
                >
                  {done ? <><Check size={12} aria-hidden="true" /> On your board</> : 'Pin'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
