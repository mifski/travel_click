'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import type { TravelCard, CardSource } from '@/lib/types'
import { getCategoryFromTags } from '@/lib/categories'
import { cn } from '@/lib/utils'
import { X, ExternalLink, MapPin, Copy, Check, Globe } from 'lucide-react'

const SOURCE_STYLES: Record<CardSource, { label: string; bg: string }> = {
  youtube:   { label: 'YT',      bg: '#ef4444' },
  tiktok:    { label: 'TikTok',  bg: '#18181b' },
  instagram: { label: 'IG',      bg: '#d946ef' },
  article:   { label: 'Web',     bg: '#0ea5e9' },
  ai:        { label: 'AI',      bg: '#8b5cf6' },
  manual:    { label: 'Saved',   bg: '#6b7280' },
}

const CONFIDENCE_DOT: Record<string, string> = {
  high: '#10b981', medium: '#f59e0b', low: '#ef4444',
}

interface Props {
  card: TravelCard
  onRemove?: (id: string) => void
  style?: React.CSSProperties
}

export function PostcardCard({ card, onRemove, style }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied]     = useState(false)

  const category = getCategoryFromTags(card.tags)
  const src      = SOURCE_STYLES[card.source] ?? SOURCE_STYLES.article
  const hasImage = !!(card.imageUrl || card.thumbnailUrl)
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
      {/* ── Corkboard card: landscape, sticker-like ── */}
      <motion.div
        style={style}
        className="postcard absolute w-[218px] select-none cursor-pointer"
        initial={{ scale: 0.72, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.07, zIndex: 50, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 20 }}
        onClick={() => setExpanded(true)}
      >
        {/* Push pin */}
        <div className="push-pin" />

        {/* Category accent bar */}
        <div className="h-[5px] rounded-t-[6px]" style={{ background: category.color }} />

        {/* Image / gradient hero */}
        <div className="relative overflow-hidden" style={{ height: 80 }}>
          {hasImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card.imageUrl ?? card.thumbnailUrl}
              alt={card.title}
              className="w-full h-full object-cover"
              onError={e => {
                e.currentTarget.style.display = 'none'
                const fb = e.currentTarget.nextElementSibling as HTMLElement
                if (fb) fb.style.display = 'flex'
              }}
            />
          )}
          {/* Fallback gradient — always present, hidden when image shows */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-1"
            style={{ background: category.heroBg, display: hasImage ? 'none' : 'flex' }}
            data-fallback="1"
          >
            <span className="text-3xl drop-shadow">{category.icon}</span>
            <span className="text-[8px] text-white/60 uppercase tracking-widest font-semibold">{category.label}</span>
          </div>

          {/* Badges */}
          <div className="absolute bottom-1.5 left-1.5">
            <span
              className={cn('flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[7px] font-bold backdrop-blur-sm', category.badgeBg, category.badgeText)}
            >
              {category.icon} {category.label}
            </span>
          </div>
          <div className="absolute top-1.5 right-1.5">
            <span
              className="text-[7px] font-bold px-1.5 py-0.5 rounded text-white"
              style={{ background: src.bg }}
            >
              {src.label}
            </span>
          </div>
        </div>

        {/* Card body */}
        <div className="px-2.5 pt-2 pb-2.5">
          <p className="text-[11px] font-bold text-[#2c1810] leading-snug line-clamp-2 mb-1">
            {card.title}
          </p>
          <div className="flex items-center gap-1">
            <MapPin size={7} className="text-amber-600 shrink-0" />
            <p className="text-[8px] text-amber-800 truncate flex-1">{locationText}</p>
            {card.confidence && (
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: CONFIDENCE_DOT[card.confidence] ?? '#f59e0b' }} />
            )}
          </div>
        </div>

        {/* Bottom stripe */}
        <div
          className="h-[5px] rounded-b-[6px]"
          style={{ background: `linear-gradient(90deg, ${category.color}80, ${category.color}, ${category.color}80)` }}
        />
      </motion.div>

      {/* ── Expanded modal — portaled to <body> so transformed card wrappers can't trap position:fixed ── */}
      {typeof document !== 'undefined' && createPortal(
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ background: 'rgba(44,24,16,0.6)', backdropFilter: 'blur(12px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setExpanded(false)}
          >
            <motion.div
              className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
              style={{ background: '#fffef9' }}
              initial={{ scale: 0.86, y: 24 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.86, y: 24 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              onClick={e => e.stopPropagation()}
            >
              {/* Accent */}
              <div className="h-2" style={{ background: category.color }} />

              {/* Hero */}
              <div className="relative" style={{ height: 200 }}>
                {hasImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={card.imageUrl ?? card.thumbnailUrl}
                    alt={card.title}
                    className="w-full h-full object-cover"
                    onError={e => {
                      e.currentTarget.style.display = 'none'
                      const fb = e.currentTarget.nextElementSibling as HTMLElement
                      if (fb) fb.style.display = 'flex'
                    }}
                  />
                )}
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center"
                  style={{ background: category.heroBg, display: hasImage ? 'none' : 'flex' }}
                  data-fallback="1"
                >
                  <span className="text-7xl drop-shadow-lg">{category.icon}</span>
                  <p className="text-white/65 text-sm mt-2 font-semibold">{category.label}</p>
                </div>

                {/* Badges */}
                <div className="absolute top-3 left-3 flex gap-1.5">
                  <span className="text-[10px] font-bold px-2 py-1 rounded-lg text-white shadow-sm" style={{ background: src.bg }}>
                    {src.label}
                  </span>
                  <span className={cn('flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold backdrop-blur-sm shadow-sm', category.badgeBg, category.badgeText)}>
                    {category.icon} {category.label}
                  </span>
                </div>

                {card.confidence && (
                  <div
                    className="absolute top-3 right-10 flex items-center gap-1 rounded-full px-2 py-1"
                    style={{ background: 'rgba(44,24,16,0.45)', backdropFilter: 'blur(4px)' }}
                  >
                    <div className="w-2 h-2 rounded-full" style={{ background: CONFIDENCE_DOT[card.confidence] ?? '#f59e0b' }} />
                    <span className="text-white/90 text-[9px] capitalize font-bold">{card.confidence}</span>
                  </div>
                )}

                <button
                  onClick={() => setExpanded(false)}
                  aria-label="Close card details"
                  className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center text-white transition-colors"
                  style={{ background: 'rgba(44,24,16,0.45)', backdropFilter: 'blur(4px)' }}
                >
                  <X size={15} />
                </button>
              </div>

              {/* Body */}
              <div className="p-5">
                {/* Title + local name */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3
                    className="font-bold text-[#1a0f00] text-lg leading-snug flex-1"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    {card.title}
                  </h3>
                  {card.location.nameLocal && (
                    <button
                      onClick={copyLocalName}
                      title="Copy local name"
                      className="flex items-center gap-1 text-amber-700/70 hover:text-amber-600 transition-colors shrink-0 mt-0.5"
                    >
                      <span className="text-sm italic font-medium">{card.location.nameLocal}</span>
                      {copied ? <Check size={12} className="text-[#6b8f5e]" /> : <Copy size={11} />}
                    </button>
                  )}
                </div>

                {/* Location chip */}
                <div className="flex items-center gap-1.5 mb-4 px-3 py-2 rounded-xl border" style={{ background: '#fff7ed', borderColor: '#fed7aa' }}>
                  <MapPin size={12} className="text-amber-600 shrink-0" />
                  <p className="text-xs text-amber-900 font-semibold">
                    {[card.location.nameEnglish, card.location.city, card.location.country].filter(Boolean).join(' · ')}
                  </p>
                </div>

                {/* Description */}
                <p className="text-sm text-[#3a2a10] leading-relaxed mb-4 line-clamp-4">{card.description}</p>

                {/* Tags */}
                {card.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {card.tags.map(tag => (
                      <span
                        key={tag}
                        className="text-[10px] px-2.5 py-1 rounded-full font-semibold"
                        style={{ background: `${category.color}18`, color: category.color, border: `1px solid ${category.color}38` }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Creator */}
                {card.creator && (
                  <div className="flex items-center gap-1.5 mb-4">
                    <Globe size={11} className="text-amber-600" />
                    <p className="text-xs text-amber-700 font-medium">via @{card.creator}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {card.sourceUrl && (
                    <a
                      href={card.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 active:scale-[0.98] transition-all"
                      style={{ background: category.color }}
                    >
                      <ExternalLink size={14} />
                      View Source
                    </a>
                  )}
                  {onRemove && (
                    <button
                      onClick={() => { onRemove(card.id); setExpanded(false) }}
                      className="px-4 py-2.5 rounded-xl text-sm font-bold hover:opacity-80 transition-colors"
                      style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' }}
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
