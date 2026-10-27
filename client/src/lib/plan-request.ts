import { useTripStore } from './store'
import { plannerPins } from './decide'

/** What /api/itinerary needs from the board: pins with priority and context, notes, flights and stays */
export function planRequestBody(tripId: string, instructions?: string) {
  const s = useTripStore.getState()
  const trip = s.trips.find((t) => t.id === tripId)
  return {
    trip,
    instructions,
    ...plannerPins(s.cards[tripId] ?? [], s.pinPriorities[tripId], s.notes[tripId] ?? []),
    flights: s.budgets[tripId]?.flights ?? [],
    stays: s.stays[tripId]?.booked ?? [],
  }
}
