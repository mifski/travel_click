'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Copy, Check, RefreshCw, Stamp } from 'lucide-react'
import type { TripContext } from '@/lib/types'
import { useTripStore } from '@/lib/store'
import { toast } from '@/components/UI/Toaster'

interface Props {
  trip: TripContext
}

export function TravelBrief({ trip }: Props) {
  const brief = useTripStore((s) => s.briefs[trip.id])
  const saveBrief = useTripStore((s) => s.saveBrief)
  const [loading, setLoading] = useState(false)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)

  async function generate() {
    setLoading(true)
    try {
      const res = await fetch('/api/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to generate brief')
      saveBrief(data.brief)
      toast.success('Travel brief ready!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate brief')
    } finally {
      setLoading(false)
    }
  }

  function copyPhrase(local: string, idx: number) {
    navigator.clipboard.writeText(local).then(() => {
      setCopiedIdx(idx)
      setTimeout(() => setCopiedIdx(null), 1500)
    })
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm border border-amber-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Stamp size={16} className="text-[#7e9ab5]" />
          <h3 className="font-bold text-[#2c1810] text-sm">Destination Brief</h3>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
            loading
              ? 'bg-amber-100 text-amber-400 cursor-not-allowed'
              : brief
              ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
              : 'text-white shadow-md hover:opacity-90'
          }`}
          style={!loading && !brief ? { background: '#7e9ab5' } : {}}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : brief ? <RefreshCw size={13} /> : null}
          {loading ? 'Researching…' : brief ? 'Refresh' : 'Get the Brief'}
        </button>
      </div>
      <p className="text-xs text-amber-700/60 mb-4">Currency, phrases, etiquette & local know-how</p>

      {!brief && !loading && (
        <p className="text-center text-amber-800/40 text-sm py-4">
          Everything you need to know before landing in {trip.destination} — in one passport page.
        </p>
      )}

      {brief && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          {/* Currency */}
          <BriefCard icon="💴" title={`Money — ${brief.currency.code}`} color="#6b8f5e">
            <p className="font-semibold text-[#2c1810]">{brief.currency.name}</p>
            <p className="mt-1">{brief.currency.cashCulture}</p>
            <p className="mt-1 italic opacity-80">{brief.currency.exchangeTip}</p>
          </BriefCard>

          {/* Power + emergency */}
          <BriefCard icon="🔌" title="Plugs & Safety" color="#c98040">
            <p><span className="font-semibold">{brief.power.plugType}</span> · {brief.power.voltage}</p>
            <p className="mt-1">{brief.power.note}</p>
            <p className="mt-2 pt-2 border-t border-dashed border-amber-300/60">
              🚓 {brief.emergency.police} · 🚑 {brief.emergency.ambulance}
            </p>
            <p className="mt-1 opacity-80">{brief.emergency.note}</p>
          </BriefCard>

          {/* Phrases */}
          <BriefCard icon="🗣️" title={`Speak ${brief.language.name}`} color="#9b72bf" wide>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
              {brief.language.phrases.map((p, i) => (
                <button
                  key={i}
                  onClick={() => copyPhrase(p.local, i)}
                  title="Copy phrase"
                  className="flex items-baseline gap-2 text-left group rounded-lg px-1.5 py-1 -mx-1.5 hover:bg-[#9b72bf]/8 transition-colors"
                >
                  <span className="font-bold text-[#2c1810] whitespace-nowrap">{p.local}</span>
                  <span className="text-[11px] opacity-70 truncate">{p.english} · {p.phonetic}</span>
                  {copiedIdx === i
                    ? <Check size={10} className="text-[#6b8f5e] shrink-0" />
                    : <Copy size={10} className="opacity-0 group-hover:opacity-50 shrink-0" />}
                </button>
              ))}
            </div>
          </BriefCard>

          {/* Getting around */}
          <BriefCard icon="🚇" title="Getting Around" color="#7e9ab5">
            {brief.gettingAround.map((tip, i) => (
              <p key={i} className="flex gap-1.5 mb-1 last:mb-0"><span className="opacity-50">•</span>{tip}</p>
            ))}
            <p className="mt-2 pt-2 border-t border-dashed border-amber-300/60 italic opacity-80">💰 {brief.tipping}</p>
          </BriefCard>

          {/* Etiquette */}
          <BriefCard icon="🙏" title="Etiquette" color="#c94040">
            {brief.etiquette.dos.map((d, i) => (
              <p key={`do-${i}`} className="flex gap-1.5 mb-1"><span className="text-[#6b8f5e] font-bold">✓</span>{d}</p>
            ))}
            {brief.etiquette.donts.map((d, i) => (
              <p key={`dont-${i}`} className="flex gap-1.5 mb-1 last:mb-0"><span className="text-[#c94040] font-bold">✗</span>{d}</p>
            ))}
          </BriefCard>

          {/* Neighbourhoods */}
          <BriefCard icon="🏘️" title="Stay Around" color="#3a7a7a" wide>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {brief.neighbourhoods.map((n) => (
                <div key={n.name} className="rounded-xl border border-dashed px-3 py-2" style={{ borderColor: '#3a7a7a50', background: '#3a7a7a08' }}>
                  <p className="font-bold text-[#2c1810] text-xs">{n.name}</p>
                  <p className="text-[11px] mt-0.5 opacity-80">{n.why}</p>
                </div>
              ))}
            </div>
          </BriefCard>
        </motion.div>
      )}
    </div>
  )
}

function BriefCard({ icon, title, color, wide, children }: {
  icon: string; title: string; color: string; wide?: boolean; children: React.ReactNode
}) {
  return (
    <div
      className={`relative rounded-xl border p-4 text-xs leading-relaxed text-[#3a2a10] ${wide ? 'sm:col-span-2' : ''}`}
      style={{ background: '#fffdf5', borderColor: `${color}38` }}
    >
      {/* passport stamp corner */}
      <div
        className="absolute top-2.5 right-2.5 stamp !text-[8px] !px-1.5 !py-0.5 !border-2"
        style={{ color, opacity: 0.45 }}
      >
        {title.split('—')[0].trim().split(' ')[0]}
      </div>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-base">{icon}</span>
        <p className="text-[10px] font-black uppercase tracking-[0.12em]" style={{ color }}>{title}</p>
      </div>
      {children}
    </div>
  )
}
