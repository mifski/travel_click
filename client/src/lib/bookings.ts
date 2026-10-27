import type { BookedFlight, BookingStub, RealityMarks, RealityReport, StubStatus, TripStay } from './types'
import { stubDeadline } from './reality'

/** One line on the booking list: AI tickets merged by venue, plus the flights and stays already booked */
export interface Ticket extends BookingStub {
  /** Every stub key merged into this ticket; status and confirmation apply to all of them */
  keys: string[]
  days: number[]
  /** Entered by the travellers in Budget or Stays: always booked */
  entered?: 'flight' | 'stay'
}

const FILLER = /\b(dinner|lunch|breakfast|reservations?|tickets?|booking|entry|timed|day|visit|meal|table)\b/g

/** "Saoto Kawaken dinner (Gion, …)" and "Saoto Kawaken (Kobe…)" both become "saoto kawaken" */
export function venueKey(stub: BookingStub): string {
  const name = stub.venue || stub.item.split('(')[0]
  return name.toLowerCase().replace(FILLER, ' ').replace(/[^a-z0-9]+/g, ' ').trim()
}

const dayOf = (date: string, tripStart: string) =>
  Math.round((Date.parse(date.slice(0, 10)) - Date.parse(tripStart.slice(0, 10))) / 86_400_000) + 1

export function bookingTickets(
  report: RealityReport | undefined,
  flights: BookedFlight[],
  stays: TripStay[],
  tripStart: string,
): Ticket[] {
  const entered: Ticket[] = [
    ...flights.map((f): Ticket => {
      const day = dayOf(f.departAt, tripStart)
      return {
        key: `flight:${f.id}`, keys: [`flight:${f.id}`], item: `Flight ${f.flightNo} ${f.from} → ${f.to}`.replace(/\s+/g, ' '),
        day, days: [day], dateBasis: 'unknown', entered: 'flight',
      }
    }),
    ...stays.map((st): Ticket => {
      const day = dayOf(st.checkIn, tripStart)
      return {
        key: `stay:${st.id}`, keys: [`stay:${st.id}`], item: `${st.name} (${st.checkIn} to ${st.checkOut})`,
        day, days: [day], dateBasis: 'unknown', entered: 'stay',
      }
    }),
  ]

  // An AI ticket for something already entered (the SQ623 flight, the booked hotel) is dropped
  const alreadyEntered = (s: BookingStub) => {
    const text = s.item.toLowerCase()
    return flights.some((f) => f.flightNo.trim() && text.includes(f.flightNo.trim().toLowerCase()))
      || stays.some((st) => st.name.trim().length > 3 && text.includes(st.name.trim().toLowerCase()))
  }

  const merged = new Map<string, Ticket>()
  for (const s of report?.stubs ?? []) {
    if (alreadyEntered(s)) continue
    const k = venueKey(s) || s.key
    const t = merged.get(k)
    if (!t) { merged.set(k, { ...s, keys: [s.key], days: [s.day] }); continue }
    t.keys.push(s.key)
    if (!t.days.includes(s.day)) t.days.push(s.day)
    // The earliest visit sets the deadline
    if (s.day < t.day) Object.assign(t, { day: s.day, opensOn: s.opensOn, bookBy: s.bookBy, dateBasis: s.dateBasis })
    t.how ??= s.how
    t.sourceUrl ??= s.sourceUrl
  }

  return [...entered, ...merged.values()].map((t) => ({ ...t, days: t.days.sort((a, b) => a - b) }))
}

export const ticketStatus = (t: Ticket, marks: RealityMarks): StubStatus =>
  t.entered ? 'booked' : marks.stubs[t.key] ?? 'to-book'

/** Still to book first, by deadline; booked and pay-on-the-day after */
export function sortTickets(tickets: Ticket[], marks: RealityMarks, checkedAt: string): Ticket[] {
  const open = (t: Ticket) => ticketStatus(t, marks) === 'to-book'
  return [...tickets].sort((a, b) =>
    Number(open(b)) - Number(open(a))
    || (open(a) ? stubDeadline(a, checkedAt).localeCompare(stubDeadline(b, checkedAt)) : a.day - b.day))
}
