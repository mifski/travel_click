'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link, Plus, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useTripStore } from '@/lib/store'
import { cn } from '@/lib/utils'

interface Props {
  tripId: string
}

export function LinkExtractor({ tripId }: Props) {
  const [url, setUrl] = useState('')
  const [caption, setCaption] = useState('')
  const [showCaption, setShowCaption] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastAdded, setLastAdded] = useState(0)

  const addCard = useTripStore((s) => s.addCard)

  async function handleExtract() {
    if (!url.trim()) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), manualCaption: caption || undefined, tripId }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Extraction failed. Try adding a manual caption.')
        return
      }

      const { cards } = data
      if (!cards?.length) {
        setError('No places found. Add a caption describing the locations.')
        return
      }

      for (const card of cards) addCard(tripId, card)
      setLastAdded(cards.length)
      setUrl('')
      setCaption('')
      setShowCaption(false)
      setTimeout(() => setLastAdded(0), 3000)
    } catch {
      setError('Failed to reach the extraction service. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm border border-amber-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-full bg-[#c94040]/10 flex items-center justify-center">
          <Link size={15} className="text-[#c94040]" />
        </div>
        <div>
          <h3 className="font-bold text-[#2c1810] text-sm">Add Places from Links</h3>
          <p className="text-xs text-amber-700/60">YouTube, TikTok, Instagram, or any article</p>
        </div>
      </div>

      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleExtract()}
          placeholder="Paste a URL…"
          className="flex-1 bg-amber-50/60 border border-amber-200 rounded-xl px-4 py-3 text-sm text-[#2c1810] placeholder-amber-700/35 focus:outline-none focus:border-amber-400 focus:bg-white transition-colors"
        />
        <motion.button
          onClick={handleExtract}
          disabled={loading || !url.trim()}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className={cn(
            'px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-md whitespace-nowrap shrink-0',
            loading || !url.trim()
              ? 'bg-amber-100 text-amber-400 cursor-not-allowed shadow-none'
              : 'text-white shadow-red-200 hover:opacity-90'
          )}
          style={loading || !url.trim() ? {} : { background: 'linear-gradient(135deg, #c94040, #e05555)' }}
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
          {loading ? 'Extracting…' : 'Pin It'}
        </motion.button>
      </div>

      <button
        type="button"
        onClick={() => setShowCaption((v) => !v)}
        className="text-xs text-amber-700/45 hover:text-amber-700 mt-2 transition-colors"
      >
        {showCaption ? '− Hide caption' : '+ Add caption (helps AI)'}
      </button>

      {showCaption && (
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Describe the location shown in the video…"
          rows={2}
          className="w-full mt-2 bg-amber-50/60 border border-amber-200 rounded-xl px-4 py-3 text-sm text-[#2c1810] placeholder-amber-700/30 focus:outline-none focus:border-amber-400 resize-none"
        />
      )}

      {error && (
        <div className="flex items-start gap-2 mt-3 p-3 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      {lastAdded > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 p-3 bg-[#c8dcc0]/40 border border-[#6b8f5e]/30 rounded-xl flex items-center gap-2"
        >
          <CheckCircle2 size={14} className="text-[#6b8f5e]" />
          <p className="text-xs text-[#3a6030] font-semibold">
            {lastAdded} place{lastAdded > 1 ? 's' : ''} pinned to your board!
          </p>
        </motion.div>
      )}
    </div>
  )
}
