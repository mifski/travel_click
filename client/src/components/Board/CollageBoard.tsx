'use client'

import { useRef, useState } from 'react'
import { motion, useMotionValue } from 'framer-motion'
import type { TravelCard, StickyNote, TripContext } from '@/lib/types'
import { PostcardCard } from './PostcardCard'
import { StickyNoteCard } from './StickyNoteCard'
import { useTripStore } from '@/lib/store'
import { getCategoryFromTags, getChipGroup } from '@/lib/categories'

/* Masonry columns — widths + downward stagger per the scrapbook layout */
const COLUMNS = [
  { width: 288, offset: 0 },
  { width: 288, offset: 34 },
  { width: 288, offset: 0 },
  { width: 250, offset: 48 },
]
export const BOARD_WIDTH = COLUMNS.reduce((w, c) => w + c.width, 0) + 26 * (COLUMNS.length - 1)

interface DraggableProps {
  x0: number
  y0: number
  rotation: number
  dimmed?: boolean
  onCommit: (x: number, y: number) => void
  children: React.ReactNode
}

/**
 * Drag layer: position is a translate offset held in motion values, persisted
 * on drag end. Store updates never feed back in, so there's no double-apply.
 */
function Draggable({ x0, y0, rotation, dimmed, onCommit, children }: DraggableProps) {
  const x = useMotionValue(x0)
  const y = useMotionValue(y0)
  const [dragging, setDragging] = useState(false)
  const suppressClickUntil = useRef(0)

  return (
    <motion.div
      drag={!dimmed}
      dragMomentum={false}
      onDragStart={() => setDragging(true)}
      onDragEnd={(_e, info) => {
        setDragging(false)
        const moved = Math.abs(info.offset.x) + Math.abs(info.offset.y)
        if (moved > 3) suppressClickUntil.current = Date.now() + 300
        onCommit(x.get(), y.get())
      }}
      onClickCapture={(e) => {
        if (Date.now() < suppressClickUntil.current) {
          e.stopPropagation()
          e.preventDefault()
        }
      }}
      style={{
        x, y,
        rotate: dragging ? 0 : rotation,
        zIndex: dragging ? 80 : 1,
        position: 'relative',
        touchAction: 'none',
        cursor: dragging ? 'grabbing' : 'grab',
        opacity: dimmed ? 0.25 : 1,
        filter: dimmed ? 'grayscale(.8)' : 'none',
        transition: 'opacity .25s ease, filter .25s ease',
      }}
      whileDrag={{ scale: 1.05 }}
    >
      {children}
    </motion.div>
  )
}

interface Props {
  trip: TripContext
  cards: TravelCard[]
  notes: StickyNote[]
  /** chip-group key to highlight; null = show all */
  activeFilter: string | null
  /** id of a note that was just created (opens focused) */
  freshNoteId?: string | null
  onOpenPin: () => void
}

export function CollageBoard({ trip, cards, notes, activeFilter, freshNoteId, onOpenPin }: Props) {
  const removeCard = useTripStore((s) => s.removeCard)
  const updateCardPosition = useTripStore((s) => s.updateCardPosition)
  const updateNotePosition = useTripStore((s) => s.updateNotePosition)
  const updateNoteText = useTripStore((s) => s.updateNoteText)
  const removeNote = useTripStore((s) => s.removeNote)

  // Round-robin into columns keeps heights balanced and the order stable
  const columns: TravelCard[][] = COLUMNS.map(() => [])
  cards.forEach((card, i) => columns[i % COLUMNS.length].push(card))

  const startMonthDay = new Date(trip.startDate)
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    .toUpperCase()

  return (
    <div className="relative flex items-start" style={{ gap: 26, width: BOARD_WIDTH, paddingBottom: 130 }}>
      {columns.map((col, ci) => (
        <div
          key={ci}
          className="flex flex-col"
          style={{ gap: 30, width: COLUMNS[ci].width, marginTop: COLUMNS[ci].offset }}
        >
          {col.map((card) => {
            const group = getChipGroup(getCategoryFromTags(card.tags).key)
            const dimmed = !!activeFilter && group !== activeFilter
            return (
              <Draggable
                key={card.id}
                x0={card.pinPosition.x}
                y0={card.pinPosition.y}
                rotation={card.pinPosition.rotation}
                dimmed={dimmed}
                onCommit={(x, y) =>
                  updateCardPosition(trip.id, card.id, { ...card.pinPosition, x, y })}
              >
                <PostcardCard card={card} onRemove={(id) => removeCard(trip.id, id)} />
              </Draggable>
            )
          })}

          {/* Column 4 carries the decorative passport stamp + the add slot */}
          {ci === COLUMNS.length - 1 && (
            <>
              <div
                aria-hidden="true"
                className="passport-stamp flex flex-col items-center justify-center gap-0.5 mx-auto"
                style={{ width: 118, height: 118, transform: 'rotate(12deg)' }}
              >
                <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.18em' }}>
                  ENTRY · {trip.country.toUpperCase()}
                </span>
                <span className="font-display" style={{ fontWeight: 800, fontSize: 19 }}>
                  {startMonthDay}
                </span>
                <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.18em' }}>
                  {trip.destination.toUpperCase()}
                </span>
              </div>

              <button
                onClick={onOpenPin}
                className="flex flex-col items-center gap-1.5 transition-all"
                style={{
                  border: '2px dashed rgba(44,24,16,.2)',
                  borderRadius: 10,
                  padding: '26px 16px',
                  color: 'rgba(44,24,16,.45)',
                  background: 'rgba(255,254,249,.4)',
                  transform: 'rotate(-1deg)',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#c94040'
                  e.currentTarget.style.color = '#c94040'
                  e.currentTarget.style.background = 'rgba(255,254,249,.8)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(44,24,16,.2)'
                  e.currentTarget.style.color = 'rgba(44,24,16,.45)'
                  e.currentTarget.style.background = 'rgba(255,254,249,.4)'
                }}
              >
                <span style={{ fontSize: 24, lineHeight: 1 }}>+</span>
                <span className="text-center font-semibold" style={{ fontSize: 12 }}>
                  Paste a TikTok, YouTube or IG link
                </span>
              </button>
            </>
          )}
        </div>
      ))}

      {/* Free-floating sticky notes over the collage */}
      {notes.map((note) => (
        <div key={note.id} className="absolute" style={{ left: 0, top: 0, width: 190, zIndex: 6 }}>
          <Draggable
            x0={note.position.x}
            y0={note.position.y}
            rotation={note.position.rotation}
            onCommit={(x, y) => updateNotePosition(trip.id, note.id, { ...note.position, x, y })}
          >
            <StickyNoteCard
              note={note}
              onTextChange={(id, text) => updateNoteText(trip.id, id, text)}
              onRemove={(id) => removeNote(trip.id, id)}
              autoFocus={note.id === freshNoteId}
            />
          </Draggable>
        </div>
      ))}

      {/* Empty board — a handwritten nudge beside the add slot */}
      {cards.length === 0 && notes.length === 0 && (
        <div className="absolute font-hand" style={{ left: 40, top: 60, fontSize: 26, color: 'rgba(44,24,16,.5)', transform: 'rotate(-2deg)', maxWidth: 420 }}>
          your scrapbook is empty — paste a TikTok, YouTube or IG link and we&rsquo;ll pin the places for you ✏️
        </div>
      )}
    </div>
  )
}
