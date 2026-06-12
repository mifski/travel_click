'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, RefreshCw, Luggage, Check } from 'lucide-react'
import type { TripContext } from '@/lib/types'
import { useTripStore } from '@/lib/store'
import { toast } from '@/components/UI/Toaster'
import { cn } from '@/lib/utils'

interface Props {
  trip: TripContext
}

export function PackingList({ trip }: Props) {
  const list = useTripStore((s) => s.packingLists[trip.id])
  const savePackingList = useTripStore((s) => s.savePackingList)
  const toggleItem = useTripStore((s) => s.togglePackingItem)
  const [loading, setLoading] = useState(false)

  async function generate() {
    setLoading(true)
    try {
      const res = await fetch('/api/packing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to generate packing list')
      savePackingList(data.list)
      toast.success('Packing list ready!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate packing list')
    } finally {
      setLoading(false)
    }
  }

  const allItems = list?.categories.flatMap((c) => c.items) ?? []
  const packed = allItems.filter((i) => i.checked).length
  const total = allItems.length
  const pct = total ? Math.round((packed / total) * 100) : 0

  return (
    <div className="bg-white/80 backdrop-blur-sm border border-amber-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Luggage size={16} className="text-[#6b8f5e]" />
          <h3 className="font-bold text-[#2c1810] text-sm">Packing List</h3>
          {total > 0 && (
            <span className={cn(
              'text-[10px] px-2 py-0.5 rounded-full font-bold border',
              pct === 100
                ? 'bg-[#c8dcc0]/60 text-[#3a6030] border-[#6b8f5e]/40'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            )}>
              {pct === 100 ? '🎉 All packed!' : `${packed}/${total} packed`}
            </span>
          )}
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className={cn(
            'px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all',
            loading
              ? 'bg-amber-100 text-amber-400 cursor-not-allowed'
              : list
              ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
              : 'text-white shadow-md hover:opacity-90'
          )}
          style={!loading && !list ? { background: '#6b8f5e' } : {}}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : list ? <RefreshCw size={13} /> : null}
          {loading ? 'Packing…' : list ? 'Regenerate' : 'Build My List'}
        </button>
      </div>
      <p className="text-xs text-amber-700/60 mb-4">Tailored to your dates, weather & activities</p>

      {!list && !loading && (
        <p className="text-center text-amber-800/40 text-sm py-4">
          AI builds a checklist for {trip.destination} — sized to your trip, season, and group.
        </p>
      )}

      {list && (
        <>
          {/* Progress bar */}
          <div className="h-2 rounded-full bg-amber-100 overflow-hidden mb-4" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: pct === 100 ? '#6b8f5e' : 'linear-gradient(90deg, #6b8f5e, #8fb380)' }}
              initial={false}
              animate={{ width: `${pct}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {list.categories.map((cat) => {
              const catPacked = cat.items.filter((i) => i.checked).length
              return (
                <div key={cat.name} className="rounded-xl border border-amber-200/80 bg-[#fffdf5] p-3.5">
                  <div className="flex items-center justify-between mb-2.5">
                    <p className="text-[11px] font-black uppercase tracking-wide text-amber-900/70 flex items-center gap-1.5">
                      <span className="text-sm">{cat.icon}</span> {cat.name}
                    </p>
                    <span className="text-[10px] text-amber-700/50 font-semibold">{catPacked}/{cat.items.length}</span>
                  </div>
                  <ul className="space-y-1">
                    {cat.items.map((item) => (
                      <li key={item.id}>
                        <button
                          onClick={() => toggleItem(trip.id, item.id)}
                          className="flex items-start gap-2 w-full text-left rounded-lg px-1.5 py-1 -mx-1.5 hover:bg-amber-50 transition-colors group"
                        >
                          <span className={cn(
                            'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all',
                            item.checked
                              ? 'bg-[#6b8f5e] border-[#6b8f5e]'
                              : 'border-amber-300 bg-white group-hover:border-[#6b8f5e]/60'
                          )}>
                            {item.checked && <Check size={11} className="text-white" strokeWidth={3.5} />}
                          </span>
                          <span className="min-w-0">
                            <span className={cn(
                              'text-xs font-medium block transition-all',
                              item.checked ? 'text-amber-800/40 line-through' : 'text-[#2c1810]'
                            )}>
                              {item.label}
                            </span>
                            {item.note && !item.checked && (
                              <span className="text-[10px] text-amber-700/50 block leading-tight">{item.note}</span>
                            )}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
