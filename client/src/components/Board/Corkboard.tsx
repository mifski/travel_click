'use client'

import { useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import type { TravelCard, StickyNote } from '@/lib/types'
import { PostcardCard } from './PostcardCard'
import { StickyNoteCard } from './StickyNoteCard'
import { useTripStore } from '@/lib/store'
import { getCategoryFromTags } from '@/lib/categories'

interface Props {
  tripId: string
  cards: TravelCard[]
  notes: StickyNote[]
  /** category keys to highlight; empty = show all */
  activeFilters: string[]
  /** id of a note that was just created (opens in edit mode) */
  freshNoteId?: string | null
}

export function Corkboard({ tripId, cards, notes, activeFilters, freshNoteId }: Props) {
  const boardRef = useRef<HTMLDivElement>(null)
  const removeCard = useTripStore((s) => s.removeCard)
  const updateCardPosition = useTripStore((s) => s.updateCardPosition)
  const updateNotePosition = useTripStore((s) => s.updateNotePosition)
  const updateNoteText = useTripStore((s) => s.updateNoteText)
  const removeNote = useTripStore((s) => s.removeNote)
  const [dragging, setDragging] = useState<string | null>(null)

  const handleCardDragEnd = useCallback(
    (cardId: string, info: { offset: { x: number; y: number } }) => {
      const card = cards.find((c) => c.id === cardId)
      if (!card) return
      updateCardPosition(tripId, cardId, {
        ...card.pinPosition,
        x: Math.max(0, card.pinPosition.x + info.offset.x),
        y: Math.max(0, card.pinPosition.y + info.offset.y),
      })
      setDragging(null)
    },
    [cards, tripId, updateCardPosition]
  )

  const handleNoteDragEnd = useCallback(
    (noteId: string, info: { offset: { x: number; y: number } }) => {
      const note = notes.find((n) => n.id === noteId)
      if (!note) return
      updateNotePosition(tripId, noteId, {
        ...note.position,
        x: Math.max(0, note.position.x + info.offset.x),
        y: Math.max(0, note.position.y + info.offset.y),
      })
      setDragging(null)
    },
    [notes, tripId, updateNotePosition]
  )

  if (cards.length === 0 && notes.length === 0) {
    return (
      <div className="cork-bg flex-1 flex items-center justify-center rounded-2xl min-h-[400px]">
        <div className="text-center opacity-60 px-6">
          <div className="text-5xl mb-4">📌</div>
          <p className="text-amber-900 font-semibold text-lg">Your board is empty</p>
          <p className="text-amber-800 text-sm mt-1">Paste a link above to pin your first place</p>
        </div>
      </div>
    )
  }

  // Board grows to fit content
  const maxY = Math.max(
    ...cards.map((c) => c.pinPosition.y + 280),
    ...notes.map((n) => n.position.y + 160),
    500
  )

  const filtering = activeFilters.length > 0

  return (
    <div
      ref={boardRef}
      className="cork-bg rounded-2xl relative overflow-auto"
      style={{
        minHeight: '500px',
        height: `${Math.max(maxY + 80, 500)}px`,
        width: '100%',
        boxShadow: 'inset 0 0 40px rgba(0,0,0,0.3), 0 4px 24px rgba(0,0,0,0.5)',
      }}
    >
      {/* Board edge shadow */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{ boxShadow: 'inset 0 0 60px rgba(0,0,0,0.2)' }} />

      {cards.map((card) => {
        const category = getCategoryFromTags(card.tags)
        const dimmed = filtering && !activeFilters.includes(category.key)
        return (
          <motion.div
            key={card.id}
            drag={!dimmed}
            dragMomentum={false}
            onDragStart={() => setDragging(card.id)}
            onDragEnd={(_e, info) => handleCardDragEnd(card.id, info)}
            style={{
              position: 'absolute',
              left: card.pinPosition.x,
              top: card.pinPosition.y,
              rotate: card.pinPosition.rotation,
              zIndex: dragging === card.id ? 100 : 1,
              opacity: dimmed ? 0.28 : 1,
              filter: dimmed ? 'grayscale(0.7)' : 'none',
              transition: 'opacity 0.25s ease, filter 0.25s ease',
            }}
            whileDrag={{ scale: 1.08, zIndex: 100, rotate: 0 }}
          >
            <PostcardCard
              card={card}
              onRemove={(id) => removeCard(tripId, id)}
            />
          </motion.div>
        )
      })}

      {notes.map((note) => (
        <motion.div
          key={note.id}
          drag
          dragMomentum={false}
          onDragStart={() => setDragging(note.id)}
          onDragEnd={(_e, info) => handleNoteDragEnd(note.id, info)}
          style={{
            position: 'absolute',
            left: note.position.x,
            top: note.position.y,
            rotate: note.position.rotation,
            zIndex: dragging === note.id ? 100 : 2,
            opacity: filtering ? 0.6 : 1,
            transition: 'opacity 0.25s ease',
          }}
          whileDrag={{ scale: 1.05, zIndex: 100, rotate: 0 }}
        >
          <StickyNoteCard
            note={note}
            onTextChange={(id, text) => updateNoteText(tripId, id, text)}
            onRemove={(id) => removeNote(tripId, id)}
            autoFocus={note.id === freshNoteId}
          />
        </motion.div>
      ))}
    </div>
  )
}
