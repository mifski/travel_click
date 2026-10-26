import type {
  ItineraryDay, RealityFinding, RealityFact, RealityReport, RealityMarks, BookingStub, StubStatus,
} from './types'

export const MAX_TRANSFERS = 3
export const EMPTY_MARKS: RealityMarks = { stubs: {}, facts: {}, dismissed: {} }

const blocksOf = (day: ItineraryDay) => [...(day.morning ?? []), ...(day.afternoon ?? []), ...(day.evening ?? [])]

/** Instant rule checks that need no AI: anchor, rest block, backups, transfer count */
export function ruleFindings(day: ItineraryDay): RealityFinding[] {
  const out: RealityFinding[] = []
  const blocks = blocksOf(day)
  if (!day.anchor?.trim()) {
    out.push({ severity: 'fix', reason: 'No anchor: the day has no one thing that matters most.', fix: 'Pick one anchor for this day and build the rest around it' })
  }
  if (!blocks.some((b) => b.category === 'rest')) {
    out.push({ severity: 'fix', reason: 'No rest block.', fix: 'Add a rest block (café, hotel break or park) of at least an hour' })
  }
  if (!day.backups?.rain?.trim() || !day.backups?.tired?.trim()) {
    out.push({ severity: 'fix', reason: 'Missing an "if it rains" or "if we are tired" backup.', fix: 'Add a rain backup and a tired backup for this day' })
  }
  const transfers = blocks.filter((b) => b.category === 'transport').length
  if (transfers > MAX_TRANSFERS) {
    out.push({ severity: 'fix', reason: `${transfers} transfers, more than ${MAX_TRANSFERS} wears the day down.`, fix: `Cut this day to at most ${MAX_TRANSFERS} transfers by grouping nearby stops` })
  }
  return out
}

export const findingKey = (day: number, f: RealityFinding) => `${day}:${f.reason}`

/** Short fingerprint of what a day plans, so a check knows whether it still describes the day */
export function daySig(day: ItineraryDay): string {
  const text = JSON.stringify([blocksOf(day).map((b) => [b.time, b.activity, b.place]), day.anchor ?? '', day.backups ?? {}])
  let h = 5381
  for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

export interface DayReality {
  findings: (RealityFinding & { key: string })[]
  facts: (RealityFact & { checkedOn?: string })[]
  /** Checked only with no open fix-now finding and no unverified key fact */
  checked: boolean
  pending: boolean
}

export function dayReality(day: ItineraryDay, report: RealityReport | undefined, marks: RealityMarks): DayReality {
  const entry = report?.days.find((d) => d.day === day.day)
  // The day changed since it was checked (a fix landed): its old AI findings no longer apply
  const stale = !!entry?.sig && entry.sig !== daySig(day)
  const ai = stale ? undefined : entry
  const findings = [...ruleFindings(day), ...(ai?.findings ?? [])]
    .map((f) => ({ ...f, key: findingKey(day.day, f) }))
    .filter((f) => !marks.dismissed[f.key])
  const facts = (ai?.facts ?? []).map((f) => ({ ...f, checkedOn: marks.facts[f.key] }))
  const pending = !report || stale
  const checked = !pending && !findings.some((f) => f.severity === 'fix') && facts.every((f) => f.checkedOn)
  return { findings, facts, checked, pending }
}

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Unknown dates get a check-again date a week after the check ran */
export const checkAgainOn = (stub: BookingStub, checkedAt: string) =>
  stub.opensOn || stub.bookBy ? undefined : addDays(checkedAt, 7)

/** The next date the user must act on: book-by, else opens-on, else check-again */
export const stubDeadline = (stub: BookingStub, checkedAt: string) =>
  stub.bookBy ?? stub.opensOn ?? checkAgainOn(stub, checkedAt)!

export function sortStubs(stubs: BookingStub[], checkedAt: string): BookingStub[] {
  return [...stubs].sort((a, b) => stubDeadline(a, checkedAt).localeCompare(stubDeadline(b, checkedAt)))
}

export function daysUntil(iso: string, today = new Date().toISOString().slice(0, 10)): number {
  return Math.round((Date.parse(iso.slice(0, 10)) - Date.parse(today)) / 86_400_000)
}

/** iCalendar file with an all-day reminder for every opens-on, book-by and check-again date */
export function buildStubsIcs(
  stubs: BookingStub[], checkedAt: string, statuses: Record<string, StubStatus>, destination: string
): string {
  const esc = (s: string) => s.replace(/[\\,;]/g, (m) => `\\${m}`).replace(/\n/g, '\\n')
  const ymd = (iso: string) => iso.slice(0, 10).replace(/-/g, '')
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')
  const events: string[] = []
  for (const s of stubs) {
    if (statuses[s.key] === 'booked' || statuses[s.key] === 'pay-on-day') continue
    const dates: [string | undefined, string][] = [
      [s.opensOn, `Booking opens: ${s.item}`],
      [s.bookBy, `Book by: ${s.item}`],
      [checkAgainOn(s, checkedAt), `Check booking dates: ${s.item}`],
    ]
    for (const [date, title] of dates) {
      if (!date) continue
      events.push([
        'BEGIN:VEVENT',
        `UID:${ymd(date)}-${s.key.replace(/[^a-z0-9]/gi, '')}-${events.length}@travelclick`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${ymd(date)}`,
        `DTEND;VALUE=DATE:${ymd(addDays(date, 1))}`,
        `SUMMARY:${esc(`${title} (${destination})`)}`,
        `DESCRIPTION:${esc(`Day ${s.day} · dates ${s.dateBasis}${s.sourceUrl ? ` · ${s.sourceUrl}` : ''}`)}`,
        'END:VEVENT',
      ].join('\r\n'))
    }
  }
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//TravelClick//Reality Layer//EN', ...events, 'END:VCALENDAR'].join('\r\n')
}
