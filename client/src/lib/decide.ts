import type { GeneratedItinerary, PinPriority, StickyNote, TravelCard, TripContext, TripPace } from './types'
import { getDayCount } from './utils'

/** Top of each pace's stop range in /api/itinerary PACE_STOPS */
export const PACE_MAX_STOPS: Record<TripPace, number> = { slow: 3, balanced: 4, full: 6 }

type Priorities = Record<string, PinPriority> | undefined

/** Unset pins are "if it fits", same as the plan sheet */
export const priorityOf = (priorities: Priorities, cardId: string): PinPriority => priorities?.[cardId] ?? 'maybe'

/** Stamp cycle on a board card: must → maybe → skip → must */
export function nextPriority(p: PinPriority): PinPriority {
  return p === 'must' ? 'maybe' : p === 'maybe' ? 'skip' : 'must'
}

/** Stops the trip can hold; arrival and departure days count half */
export function tripCapacity(trip: TripContext): number {
  const days = Math.max(1, getDayCount(trip.startDate, trip.endDate))
  return Math.max(1, days - 1) * PACE_MAX_STOPS[trip.pace ?? 'balanced']
}

export const mustCards = (cards: TravelCard[], priorities: Priorities) =>
  cards.filter((c) => priorityOf(priorities, c.id) === 'must')

export interface PlannerPin {
  id: string
  name: string
  priority: 'must' | 'maybe'
  description?: string
  tags?: string[]
}

/** Non-skipped pins with their context, plus sticky-note text */
export function plannerPins(cards: TravelCard[], priorities: Priorities, notes: StickyNote[]) {
  const pins: PlannerPin[] = cards.flatMap((c) => {
    const priority = priorityOf(priorities, c.id)
    if (priority === 'skip') return []
    return [{
      id: c.id,
      name: [c.location.nameEnglish || c.title, c.location.city, c.location.country].filter(Boolean).join(', '),
      priority,
      description: c.description?.slice(0, 200),
      tags: c.tags.slice(0, 6),
    }]
  })
  return { pins, notes: notes.map((n) => n.text.trim()).filter(Boolean) }
}

/** cardId → day numbers it appears on */
export function placedDays(itinerary: GeneratedItinerary | null): Record<string, number[]> {
  const out: Record<string, number[]> = {}
  for (const d of itinerary?.days ?? []) {
    for (const b of [...(d.morning ?? []), ...(d.afternoon ?? []), ...(d.evening ?? [])]) {
      if (!b.cardId) continue
      const days = (out[b.cardId] ??= [])
      if (!days.includes(d.day)) days.push(d.day)
    }
  }
  return out
}

/** Must-go pins the plan dropped; only meaningful once the plan carries card links */
export function unplacedMusts(cards: TravelCard[], priorities: Priorities, itinerary: GeneratedItinerary | null): TravelCard[] {
  const placed = placedDays(itinerary)
  if (!itinerary || !Object.keys(placed).length) return []
  return mustCards(cards, priorities).filter((c) => !placed[c.id])
}
