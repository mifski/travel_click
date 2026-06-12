'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import type { StickyNote } from '@/lib/types'
import { STICKY_COLORS } from '@/lib/types'

interface Props {
  note: StickyNote
  onTextChange: (id: string, text: string) => void
  onRemove: (id: string) => void
  /** start in edit mode (for freshly added notes) */
  autoFocus?: boolean
}

export function StickyNoteCard({ note, onTextChange, onRemove, autoFocus }: Props) {
  const [editing, setEditing] = useState(!!autoFocus)
  const [draft, setDraft] = useState(note.text)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing) {
      textareaRef.current?.focus()
      textareaRef.current?.setSelectionRange(draft.length, draft.length)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing])

  function commit() {
    setEditing(false)
    // An empty note is clutter — remove it rather than leave a blank square pinned
    if (!draft.trim() && !note.text.trim()) {
      onRemove(note.id)
      return
    }
    if (draft !== note.text) onTextChange(note.id, draft)
  }

  const c = STICKY_COLORS[note.color] ?? STICKY_COLORS.yellow

  return (
    <div
      className="sticky-note group"
      style={{ background: c.bg, color: c.text }}
      onDoubleClick={() => { setDraft(note.text); setEditing(true) }}
    >
      <div className="washi-tape" />

      {/* delete */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(note.id) }}
        aria-label="Delete note"
        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-70 hover:!opacity-100 transition-opacity"
        style={{ background: 'rgba(0,0,0,0.08)', color: c.text }}
      >
        <X size={12} />
      </button>

      {editing ? (
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
          className="w-full bg-transparent resize-none outline-none placeholder:opacity-40"
          style={{ color: c.text, font: 'inherit', lineHeight: 'inherit' }}
        />
      ) : (
        <p className="whitespace-pre-wrap break-words select-none min-h-[60px]">
          {note.text || <span className="opacity-40">Double-click to write…</span>}
        </p>
      )}
    </div>
  )
}
