'use client'

import { useEffect, useRef, useState } from 'react'
import type { StickyNote, StickyColor } from '@/lib/types'

/* Gradient pairs per sticky colour — warm paper, no border radius */
const STICKY_GRADIENTS: Record<StickyColor, { top: string; bottom: string; text: string; tape: string }> = {
  yellow: { top: '#fdf3b9', bottom: '#f7e88e', text: '#4a3520', tape: 'rgba(232,168,184,.6)' },
  pink:   { top: '#fcd5e0', bottom: '#f8c0d2', text: '#7a2a45', tape: 'rgba(192,212,232,.65)' },
  blue:   { top: '#d5e6f6', bottom: '#bcd6ee', text: '#2a4a6a', tape: 'rgba(240,196,196,.6)' },
  green:  { top: '#dfeed2', bottom: '#c9e2b4', text: '#33531f', tape: 'rgba(232,168,184,.6)' },
}

interface Props {
  note: StickyNote
  onTextChange: (id: string, text: string) => void
  onRemove: (id: string) => void
  /** focus the textarea straight away (for freshly added notes) */
  autoFocus?: boolean
}

export function StickyNoteCard({ note, onTextChange, onRemove, autoFocus }: Props) {
  const [draft, setDraft] = useState(note.text)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const c = STICKY_GRADIENTS[note.color] ?? STICKY_GRADIENTS.yellow

  useEffect(() => {
    if (autoFocus) {
      textareaRef.current?.focus()
      textareaRef.current?.setSelectionRange(draft.length, draft.length)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus])

  function commit() {
    // An empty note is clutter — remove it rather than leave a blank square pinned
    if (!draft.trim() && !note.text.trim()) {
      onRemove(note.id)
      return
    }
    if (draft !== note.text) onTextChange(note.id, draft)
  }

  return (
    <div
      className="sticky-note group"
      style={{ background: `linear-gradient(180deg, ${c.top}, ${c.bottom})`, color: c.text }}
    >
      <span aria-hidden="true" className="washi-tape" style={{ background: c.tape }} />

      {/* delete */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(note.id) }}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label="Delete note"
        className="absolute top-1 right-2 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
        style={{ fontSize: 14, color: c.text, lineHeight: 1 }}
      >
        ×
      </button>

      <textarea
        ref={textareaRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Escape' || (e.key === 'Enter' && e.metaKey)) commit() }}
        onPointerDown={(e) => e.stopPropagation()}
        rows={4}
        maxLength={180}
        placeholder="Write a note…"
        className="w-full bg-transparent resize-none outline-none placeholder:opacity-40 cursor-text"
        style={{ color: c.text, font: 'inherit', lineHeight: 'inherit', minHeight: 90 }}
      />
    </div>
  )
}
