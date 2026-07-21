'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import type { TravelCard, CardSource } from '@/lib/types'
import { getCategoryFromTags } from '@/lib/categories'
import { X, ExternalLink, MapPin, Copy, Check, Globe } from 'lucide-react'

/* Source tags render as bare coloured text on the print border — no pill */
const SOURCE_STYLES: Record<CardSource, { label: string; color: string }> = {
  youtube:      { label: 'YT',     color: '#ef4444' },
  tiktok:       { label: 'TIKTOK', color: '#c94040' },
  instagram:    { label: 'IG',     color: '#d946ef' },
  xiaohongshu:  { label: 'XHS',    color: '#ff2442' },
  article:      { label: 'WEB',    color: '#0ea5e9' },
  ai:           { label: 'AI',     color: '#8b5cf6' },
  manual:       { label: 'SAVED',  color: '#2c1810' },
}

const CONFIDENCE_DOT: Record<string, string> = {
  high: '#10b981', medium: '#f59e0b', low: '#ef4444',
}

/* Washi tape variants — roughly half the cards get one, chosen by id hash */
const TAPES = [
  { bg: 'rgba(200,220,192,.7)',  rot: -5, left: 38 },
  { bg: 'rgba(192,212,232,.7)',  rot: 6,  right: 30 },
  { bg: 'rgba(240,196,196,.6)',  rot: 5,  right: 36 },
  { bg: 'rgba(232,168,184,.6)',  rot: -4, left: 36 },
]

function hashId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return Math.abs(h)
}

interface Props {
  card: TravelCard
  onRemove?: (id: string) => void
  style?: React.CSSProperties
}

export function PostcardCard({ card, onRemove, style }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied]     = useState(false)
  const [imgFailed, setImgFailed] = useState(false)

  const category = getCategoryFromTags(card.tags)
  const src      = SOURCE_STYLES[card.source] ?? SOURCE_STYLES.article
  const hasImage = !!(card.imageUrl || card.thumbnailUrl) && !imgFailed
  const hash     = hashId(card.id)
  const tape     = hash % 2 === 0 ? TAPES[hash % TAPES.length] : null
  const imgHeight = 150 + (hash % 106) // 150–255px, stable per card

  const neighbourhood = card.location.city?.split(',')[0] ?? card.location.nameEnglish
  const tip = card.description?.split(/[.!—]/)[0]?.trim()
  const subline = [neighbourhood, tip && tip.length <= 44 ? tip : null].filter(Boolean).join(' · ')

  const locationText = [card.location.city, card.location.country].filter(Boolean).join(', ')
    || card.location.nameEnglish || 'Unknown location'

  function copyLocalName() {
    if (!card.location.nameLocal) return
    navigator.clipboard.writeText(card.location.nameLocal).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <>
      {/* ── Paper photo print ── */}
      <div
        style={style}
        className="paper-print w-full select-none cursor-pointer"
        onClick={() => setExpanded(true)}
      >
        {tape && (
          <span
            aria-hidden="true"
            className="washi"
            style={{
              top: -10,
              left: 'left' in tape ? tape.left : undefined,
              right: 'right' in tape ? tape.right : undefined,
              width: 64 + (hash % 11),
              height: 20 + (hash % 3),
              background: tape.bg,
              transform: `rotate(${tape.rot}deg)`,
            }}
          />
        )}

        {hasImage ? (
          /* Photo print: white border, full-bleed image, handwritten caption */
          <div style={{ padding: '11px 11px 13px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={card.imageUrl ?? card.thumbnailUrl}
              alt={card.title}
              draggable={false}
              className="block w-full object-cover"
              style={{ height: imgHeight }}
              onError={() => setImgFailed(true)}
            />
            <div className="flex items-baseline justify-between gap-2 mt-2.5">
              <span className="font-hand text-[#2c1810] leading-tight truncate" style={{ fontSize: 20 }}>
                {card.title}
              </span>
              <span className="shrink-0 font-extrabold" style={{ fontSize: 9.5, letterSpacing: '.08em', color: src.color }}>
                {src.label}
              </span>
            </div>
            {subline && (
              <span className="block truncate" style={{ fontSize: 10.5, color: 'rgba(44,24,16,.5)' }}>
                {subline}
              </span>
            )}
          </div>
        ) : (
          /* Text-only print: ruled notebook paper */
          <div className="ruled-paper" style={{ padding: '18px 18px 16px' }}>
            {card.location.nameLocal && (
              <span className="font-display block" style={{ fontWeight: 900, fontSize: 30, color: 'rgba(201,64,64,.85)', lineHeight: 1 }}>
                {card.location.nameLocal}
              </span>
            )}
            <p className="font-display m-0" style={{ fontWeight: 800, fontSize: 19, color: '#2c1810', lineHeight: 1.15, marginTop: card.location.nameLocal ? 8 : 0 }}>
              {card.title}
            </p>
            {tip && (
              <p className="font-hand m-0" style={{ fontSize: 19, lineHeight: 1.3, color: '#2c1810', marginTop: 8 }}>
                {tip}
              </p>
            )}
            <span className="inline-block font-extrabold uppercase" style={{ marginTop: 8, fontSize: 9.5, letterSpacing: '.1em', color: '#a86030' }}>
              {[category.label, neighbourhood, src.label].filter(Boolean).join(' · ')}
            </span>
          </div>
        )}
      </div>

      {/* ── Expanded modal — portaled to <body> so transformed card wrappers can't trap position:fixed ── */}
      {typeof document !== 'undefined' && createPortal(
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ background: 'rgba(32,18,9,0.55)', backdropFilter: 'blur(3px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setExpanded(false)}
          >
            <motion.div
              className="w-full max-w-md overflow-hidden"
              style={{ background: '#fffef9', borderRadius: 16, boxShadow: '0 40px 90px -20px rgba(0,0,0,.6)' }}
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              onClick={e => e.stopPropagation()}
            >
              {/* Hero */}
              <div className="relative" style={{ height: hasImage ? 210 : 90 }}>
                {hasImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={card.imageUrl ?? card.thumbnailUrl}
                    alt={card.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="ruled-paper w-full h-full flex items-center justify-center">
                    <span className="font-display" style={{ fontWeight: 900, fontSize: 44, color: 'rgba(201,64,64,.5)' }}>
                      {card.location.nameLocal ?? category.icon}
                    </span>
                  </div>
                )}

                <div className="absolute top-3 left-4 flex items-center gap-2">
                  <span
                    className="font-extrabold px-2 py-1"
                    style={{ fontSize: 10, letterSpacing: '.1em', color: '#fff', background: src.color === '#2c1810' ? '#2c1810' : src.color, borderRadius: 6 }}
                  >
                    {src.label}
                  </span>
                  {card.confidence && (
                    <span
                      className="flex items-center gap-1 rounded-full px-2 py-1"
                      style={{ background: 'rgba(44,24,16,0.45)', backdropFilter: 'blur(4px)' }}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ background: CONFIDENCE_DOT[card.confidence] ?? '#f59e0b' }} />
                      <span className="text-white/90 capitalize font-bold" style={{ fontSize: 9 }}>{card.confidence}</span>
                    </span>
                  )}
                </div>

                <button
                  onClick={() => setExpanded(false)}
                  aria-label="Close card details"
                  className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center text-white transition-colors hover:bg-black/60"
                  style={{ background: 'rgba(44,24,16,0.45)', backdropFilter: 'blur(4px)' }}
                >
                  <X size={15} />
                </button>
              </div>

              {/* Body */}
              <div style={{ padding: '20px 26px 24px' }}>
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <h3 className="font-display flex-1 leading-snug" style={{ fontWeight: 800, fontSize: 22, color: '#2c1810' }}>
                    {card.title}
                  </h3>
                  {card.location.nameLocal && (
                    <button
                      onClick={copyLocalName}
                      title="Copy local name"
                      className="flex items-center gap-1 shrink-0 mt-1 transition-colors hover:opacity-70"
                      style={{ color: '#a86030' }}
                    >
                      <span className="font-hand" style={{ fontSize: 18 }}>{card.location.nameLocal}</span>
                      {copied ? <Check size={12} style={{ color: '#6b8f5e' }} /> : <Copy size={11} />}
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 mb-3">
                  <MapPin size={11} style={{ color: '#c94040' }} className="shrink-0" />
                  <p className="font-semibold" style={{ fontSize: 12, color: 'rgba(44,24,16,.65)' }}>
                    {[card.location.nameEnglish, card.location.city, card.location.country].filter(Boolean).join(' · ') || locationText}
                  </p>
                </div>

                <p className="leading-relaxed mb-4 line-clamp-4" style={{ fontSize: 12.5, color: 'rgba(44,24,16,.7)' }}>
                  {card.description}
                </p>

                {card.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {card.tags.map(tag => (
                      <span
                        key={tag}
                        className="font-bold uppercase px-2.5 py-1 rounded-full"
                        style={{ fontSize: 9.5, letterSpacing: '.06em', background: `${category.color}14`, color: category.color, border: `1px solid ${category.color}30` }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {card.creator && (
                  <div className="flex items-center gap-1.5 mb-4">
                    <Globe size={11} style={{ color: '#a86030' }} />
                    <p className="font-hand" style={{ fontSize: 16, color: 'rgba(44,24,16,.6)' }}>via @{card.creator}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  {card.sourceUrl && (
                    <a
                      href={card.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pill-coral pill-lift flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full font-semibold"
                      style={{ fontSize: 12.5 }}
                    >
                      <ExternalLink size={13} />
                      View source
                    </a>
                  )}
                  {onRemove && (
                    <button
                      onClick={() => { onRemove(card.id); setExpanded(false) }}
                      className="px-4 py-2.5 rounded-full font-semibold transition-colors hover:opacity-80"
                      style={{ fontSize: 12.5, color: 'rgba(44,24,16,.55)', border: '1px solid rgba(44,24,16,.18)' }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
      )}
    </>
  )
}
