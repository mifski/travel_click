import { useTripStore } from './store'

/** What /api/itinerary needs from the board: pins split by priority, flights and stays */
export function planRequestBody(tripId: string, instructions?: string) {
  const s = useTripStore.getState()
  const trip = s.trips.find((t) => t.id === tripId)
  const cards = s.cards[tripId] ?? []
  const priorities = s.pinPriorities[tripId] ?? {}
  const label = (c: (typeof cards)[number]) =>
    [c.location.nameEnglish || c.title, c.location.city, c.location.country].filter(Boolean).join(', ')
  return {
    trip,
    instructions,
    mustGo: cards.filter((c) => priorities[c.id] === 'must').map(label),
    maybe: cards.filter((c) => (priorities[c.id] ?? 'maybe') === 'maybe').map(label),
    flights: s.budgets[tripId]?.flights ?? [],
    stays: s.stays[tripId]?.booked ?? [],
  }
}
