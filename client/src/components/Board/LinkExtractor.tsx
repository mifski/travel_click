'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTripStore } from '@/lib/store'
import { toast } from '@/components/UI/Toaster'

const EXTRACT_STEPS = [
  'Fetching the video…',
  'Watching frames for places…',
  'Reading the caption…',
  'Cross-checking the map…',
]

interface Props {
  tripId: string
  open: boolean
  onClose: () => void
}

/** Pin-a-link modal — paste a social link, watch the staged extraction, get cards on the board. */
export function LinkExtractor({ tripId, open, onClose }: Props) {
  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open && <PinDialog tripId={tripId} onClose={onClose} />}
    </AnimatePresence>,
    document.body
  )
}

/* Mounts fresh on every open, so URL / caption / progress always start clean */
function PinDialog({ tripId, onClose }: { tripId: string; onClose: () => void }) {
  const [url, setUrl] = useState('')
  const [caption, setCaption] = useState('')
  const [showCaption, setShowCaption] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [statusLine, setStatusLine] = useState(EXTRACT_STEPS[0])
  const [error, setError] = useState('')
  const addCard = useTripStore((s) => s.addCard)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 60)
    const cleanup = timers.current
    return () => { clearTimeout(t); cleanup.forEach(clearTimeout) }
  }, [])

  function later(fn: () => void, ms: number) {
    timers.current.push(setTimeout(fn, ms))
  }

  async function handleExtract() {
    if (!url.trim() || extracting) return
    setExtracting(true)
    setError('')

    // Staged narration cycles while the real extraction runs
    let step = 0
    setStatusLine(EXTRACT_STEPS[0])
    const cycle = setInterval(() => {
      step = (step + 1) % EXTRACT_STEPS.length
      setStatusLine(EXTRACT_STEPS[step])
    }, 850)
    timers.current.push(cycle as unknown as ReturnType<typeof setTimeout>)

    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), manualCaption: caption || undefined, tripId }),
      })
      const data = await res.json()
      clearInterval(cycle)

      if (!res.ok) {
        setExtracting(false)
        setError(data.error ?? 'Extraction failed. Try adding a manual caption.')
        return
      }

      const cards = data.cards ?? []
      if (!cards.length) {
        setExtracting(false)
        setError('No places found. Add a caption describing the locations.')
        return
      }

      // Land the last two beats, then pin for real
      setStatusLine(`Found ${cards.length === 1 ? `one: ${cards[0].title}` : `${cards.length} places`} 📍`)
      later(() => setStatusLine('Pinning to your board…'), 800)
      later(() => {
        for (const card of cards) addCard(tripId, card)
        setExtracting(false)
        onClose()
        toast.success(`Pinned to your board 📌`)
      }, 1400)
    } catch {
      clearInterval(cycle)
      setExtracting(false)
      setError('Failed to reach the extraction service. Make sure the backend is running.')
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(32,18,9,.55)', backdropFilter: 'blur(3px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={() => { if (!extracting) onClose() }}
    >
      <motion.div
        className="w-full"
        style={{
          maxWidth: 460,
          background: '#fffef9',
          borderRadius: 16,
          padding: '26px 28px',
          boxShadow: '0 40px 90px -20px rgba(0,0,0,.6)',
        }}
        initial={{ scale: 0.94, y: 14 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, y: 14 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-baseline justify-between">
          <span className="font-display" style={{ fontWeight: 800, fontSize: 22, color: '#2c1810' }}>
            Pin a link 🔗
          </span>
          <button
            onClick={() => { if (!extracting) onClose() }}
            aria-label="Close"
            className="transition-colors hover:text-[#c94040]"
            style={{ fontSize: 16, color: 'rgba(44,24,16,.4)' }}
          >
            ×
          </button>
        </div>

        <p style={{ margin: '6px 0 16px', fontSize: 12.5, color: 'rgba(44,24,16,.55)', lineHeight: 1.5 }}>
          Paste a TikTok, YouTube, IG or article link — we watch it and extract the places.
        </p>

        <input
          ref={inputRef}
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleExtract()}
          disabled={extracting}
          placeholder="https://www.tiktok.com/@tokyo.wanders/video/…"
          className="w-full focus:outline-none"
          style={{
            boxSizing: 'border-box',
            padding: '12px 14px',
            border: '1.5px solid rgba(44,24,16,.18)',
            borderRadius: 10,
            background: '#faf6f0',
            fontSize: 13,
            color: '#2c1810',
          }}
        />

        {!extracting && (
          <>
            <button
              type="button"
              onClick={() => setShowCaption((v) => !v)}
              className="font-hand transition-colors hover:text-[#a86030]"
              style={{ marginTop: 8, fontSize: 16, color: 'rgba(44,24,16,.45)' }}
            >
              {showCaption ? '− hide caption' : '+ add a caption (helps the AI)'}
            </button>
            {showCaption && (
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Describe the location shown in the video…"
                rows={2}
                className="w-full mt-2 resize-none focus:outline-none"
                style={{
                  padding: '10px 14px',
                  border: '1.5px solid rgba(44,24,16,.14)',
                  borderRadius: 10,
                  background: '#faf6f0',
                  fontSize: 13,
                  color: '#2c1810',
                }}
              />
            )}
          </>
        )}

        {extracting && (
          <div className="flex items-center gap-2.5" style={{ marginTop: 16 }}>
            <span
              className="tc-spinner"
              style={{ width: 18, height: 18, border: '2.5px solid rgba(201,64,64,.25)', borderTopColor: '#c94040' }}
            />
            <AnimatePresence mode="wait">
              <motion.span
                key={statusLine}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
                className="font-hand"
                style={{ fontSize: 18, color: '#a86030' }}
              >
                {statusLine}
              </motion.span>
            </AnimatePresence>
          </div>
        )}

        {error && (
          <p style={{ marginTop: 12, fontSize: 12, color: '#a12f2f', lineHeight: 1.5 }}>
            {error}
          </p>
        )}

        <div className="flex justify-end items-center gap-2.5" style={{ marginTop: 18 }}>
          <button
            onClick={() => { if (!extracting) onClose() }}
            className="rounded-full transition-colors hover:text-[#2c1810]"
            style={{ padding: '10px 18px', color: 'rgba(44,24,16,.55)', fontSize: 12.5 }}
          >
            Cancel
          </button>
          <button
            onClick={handleExtract}
            disabled={extracting || !url.trim()}
            className="pill-coral pill-lift rounded-full font-semibold disabled:opacity-50"
            style={{ padding: '10px 22px', fontSize: 12.5 }}
          >
            {extracting ? 'Extracting…' : '✦ Extract places'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
