'use client'

import type { ItineraryDay, RealityReport, RealityMarks, BookingStub, StubStatus, TripPace } from '@/lib/types'
import { useTripStore } from '@/lib/store'
import { Star, Clock, Armchair, Umbrella, Coffee, Check, CalendarPlus, type LucideIcon } from 'lucide-react'
import { type DayReality, checkAgainOn, daysUntil, sortStubs, stubDeadline, buildStubsIcs } from '@/lib/reality'

const cream = (a: number) => `rgba(242,234,216,${a})`
const GOLD = '#c9a84c'
const CORAL = '#e0705f'
const label: React.CSSProperties = { fontSize: 9.5, fontWeight: 800, letterSpacing: '.2em', color: 'rgba(201,168,76,.7)' }

/* ── Stamp ── */

export function RealityStamp({ reality, checking }: { reality: DayReality; checking: boolean }) {
  const text = checking || reality.pending ? 'CHECKING…' : reality.checked ? 'CHECKED' : 'CHECK AGAIN'
  const color = checking || reality.pending ? cream(0.4) : reality.checked ? '#8fbf7a' : CORAL
  return (
    <span
      role="status"
      title="Checked = no fix-now finding and every key fact verified by you"
      className="font-display inline-block select-none"
      style={{
        border: `2px solid ${color}`, color, padding: '4px 12px', borderRadius: 4, fontSize: 12, fontWeight: 900,
        letterSpacing: '.18em', transform: 'rotate(-4deg)', boxShadow: `inset 0 0 0 1px ${color}40`,
      }}
    >
      {text}
    </span>
  )
}

/* ── Pace ribbon: anchor · start · rest · backups ── */

export function PaceRibbon({ day }: { day: ItineraryDay }) {
  const blocks = [...(day.morning ?? []), ...(day.afternoon ?? []), ...(day.evening ?? [])]
  const rest = blocks.find((b) => b.category === 'rest')
  const items: [string, LucideIcon, string | undefined][] = [
    ['ANCHOR', Star, day.anchor],
    ['START', Clock, blocks[0]?.time],
    ['REST', Armchair, rest ? `${rest.time} · ${rest.activity}` : undefined],
    ['IF IT RAINS', Umbrella, day.backups?.rain],
    ['IF WE’RE TIRED', Coffee, day.backups?.tired],
  ]
  return (
    <div
      className="flex flex-wrap"
      style={{ gap: '10px 22px', padding: '12px 16px', marginBottom: 22, border: `1px dashed ${cream(0.2)}`, borderRadius: 10, maxWidth: 640 }}
    >
      {items.map(([k, Icon, v]) => (
        <div key={k} style={{ minWidth: 90, maxWidth: 260 }}>
          <div className="flex items-center" style={{ ...label, gap: 5 }}><Icon size={11} aria-hidden="true" />{k}</div>
          <div style={{ fontSize: 12.5, marginTop: 3, color: v ? '#f2ead8' : CORAL }}>{v ?? 'missing'}</div>
        </div>
      ))}
    </div>
  )
}

/* ── Findings + key facts for one day ── */

interface DayPanelProps {
  tripId: string
  reality: DayReality
  stubs: BookingStub[]
  checkedAt?: string
  statuses: Record<string, StubStatus>
  onFix: (fix: string) => void
  busy: boolean
}

export function DayRealityPanel({ tripId, reality, stubs, checkedAt, statuses, onFix, busy }: DayPanelProps) {
  const markFactChecked = useTripStore((s) => s.markFactChecked)
  const dismissFinding = useTripStore((s) => s.dismissFinding)
  if (!reality.findings.length && !reality.facts.length && !stubs.length) return null

  return (
    <div style={{ marginBottom: 26, maxWidth: 640 }}>
      {reality.findings.length > 0 && (
        <>
          <span style={label}>REALITY CHECK</span>
          {reality.findings.map((f) => (
            <div key={f.key} className="flex items-start" style={{ gap: 10, marginTop: 8 }}>
              <span
                className="shrink-0"
                style={{
                  fontSize: 9, fontWeight: 800, letterSpacing: '.1em', padding: '3px 7px', borderRadius: 999, marginTop: 1,
                  background: f.severity === 'fix' ? CORAL : 'transparent', color: f.severity === 'fix' ? '#201209' : GOLD,
                  border: f.severity === 'fix' ? 'none' : `1px solid ${GOLD}`,
                }}
              >
                {f.severity === 'fix' ? 'FIX NOW' : 'TAKE A LOOK'}
              </span>
              <div className="flex-1" style={{ fontSize: 12.5, lineHeight: 1.5, color: cream(0.75) }}>
                {f.reason}
                <div className="flex flex-wrap" style={{ gap: 12, marginTop: 4 }}>
                  <button
                    onClick={() => onFix(f.fix)}
                    disabled={busy}
                    className="disabled:opacity-40"
                    style={{ color: GOLD, fontSize: 11.5, fontWeight: 700, borderBottom: `1px dotted ${GOLD}` }}
                    title={f.fix}
                  >
                    ✦ Fix: {f.fix}
                  </button>
                  {f.severity === 'look' && (
                    <button onClick={() => dismissFinding(tripId, f.key)} style={{ color: cream(0.55), fontSize: 11 }}>
                      Looks fine
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      {reality.facts.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <span style={label}>KEY FACTS</span>
          {reality.facts.map((f) => (
            <div key={f.key} className="flex flex-wrap items-baseline" style={{ gap: 10, marginTop: 6, fontSize: 12, color: cream(0.7) }}>
              <span>{f.text}</span>
              {f.checkedOn ? (
                <span className="inline-flex items-center" style={{ gap: 4, fontSize: 10, color: '#8fbf7a', fontWeight: 700 }}><Check size={11} strokeWidth={3} aria-hidden="true" /> verified by you · {f.checkedOn}</span>
              ) : (
                <>
                  <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.1em', color: CORAL }}>UNVERIFIED</span>
                  {f.sourceUrl && (
                    <a href={f.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: GOLD }}>
                      source ↗
                    </a>
                  )}
                  <button onClick={() => markFactChecked(tripId, f.key)} style={{ fontSize: 11, color: GOLD, borderBottom: `1px dotted ${GOLD}` }}>
                    I checked this
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {stubs.length > 0 && checkedAt && (
        <div className="flex flex-wrap" style={{ gap: 12, marginTop: 16 }}>
          {stubs.map((s) => <TicketStub key={s.key} tripId={tripId} stub={s} checkedAt={checkedAt} status={statuses[s.key] ?? 'to-book'} />)}
        </div>
      )}
    </div>
  )
}

/* ── Ticket stub ── */

const STATUS_LABEL: Record<StubStatus, string> = { 'to-book': 'To book', booked: 'Booked', 'pay-on-day': 'Pay on the day' }

function dateLine(stub: BookingStub, checkedAt: string): string {
  const again = checkAgainOn(stub, checkedAt)
  if (again) return `Dates unknown · check again ${again}`
  return [stub.opensOn && `Opens ${stub.opensOn}`, stub.bookBy && `Book by ${stub.bookBy}`].filter(Boolean).join(' · ') + ' (estimated)'
}

export function TicketStub({ tripId, stub, checkedAt, status }: { tripId: string; stub: BookingStub; checkedAt: string; status: StubStatus }) {
  const setStubStatus = useTripStore((s) => s.setStubStatus)
  const left = daysUntil(stubDeadline(stub, checkedAt))
  const done = status !== 'to-book'
  return (
    <div
      className="flex"
      style={{ background: '#f2ead8', color: '#2c1810', borderRadius: 4, minWidth: 260, maxWidth: 340, opacity: done ? 0.65 : 1, boxShadow: '0 10px 24px -10px rgba(0,0,0,.6)' }}
    >
      <div className="flex-1" style={{ padding: '10px 12px' }}>
        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.16em', color: '#a86030' }}>DAY {stub.day} · TICKET</div>
        <div className="font-display" style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.25, marginTop: 2 }}>{stub.item}</div>
        <div style={{ fontSize: 10.5, marginTop: 4, color: '#6b4a32' }}>{dateLine(stub, checkedAt)}</div>
      </div>
      {/* Perforated tear-off */}
      <div
        className="flex flex-col items-center justify-center"
        style={{ width: 92, borderLeft: '2px dashed rgba(44,24,16,.35)', padding: '8px 6px', gap: 6 }}
      >
        <span style={{ fontWeight: 900, fontSize: 15, color: done ? '#6b8f5e' : left < 0 ? '#c94040' : '#2c1810' }}>
          {done ? <Check size={18} strokeWidth={3} aria-label={STATUS_LABEL[status]} /> : left < 0 ? 'late' : left === 0 ? 'today' : `${left}d`}
        </span>
        <select
          aria-label={`Booking status for ${stub.item}`}
          value={status}
          onChange={(e) => setStubStatus(tripId, stub.key, e.target.value as StubStatus)}
          style={{ fontSize: 10, background: 'transparent', border: '1px solid rgba(44,24,16,.3)', borderRadius: 4, width: '100%' }}
        >
          {(Object.keys(STATUS_LABEL) as StubStatus[]).map((k) => <option key={k} value={k}>{STATUS_LABEL[k]}</option>)}
        </select>
      </div>
    </div>
  )
}

/* ── Book-by list (all stubs, next deadline first) ── */

export function BookByList({ tripId, report, marks, destination }: { tripId: string; report: RealityReport; marks: RealityMarks; destination: string }) {
  if (!report.stubs.length) return null
  const sorted = sortStubs(report.stubs, report.checkedAt)

  function downloadIcs() {
    const ics = buildStubsIcs(sorted, report.checkedAt, marks.stubs, destination)
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }))
    a.download = `${destination.toLowerCase().replace(/\s+/g, '-')}-booking-dates.ics`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div style={{ padding: '40px 40px 0' }}>
      <div className="flex items-center flex-wrap" style={{ gap: 16, marginBottom: 12 }}>
        <span style={label}>BOOK-BY LIST</span>
        <button
          onClick={downloadIcs}
          className="rounded-full transition-all hover:border-[#c9a84c] hover:text-[#c9a84c] inline-flex items-center gap-1.5"
          style={{ padding: '6px 14px', border: `1px solid ${cream(0.25)}`, color: cream(0.7), fontSize: 11 }}
        >
          <CalendarPlus size={13} aria-hidden="true" /> Add dates to Calendar (.ics)
        </button>
      </div>
      <div className="flex flex-wrap" style={{ gap: 12 }}>
        {sorted.map((s) => (
          <TicketStub key={s.key} tripId={tripId} stub={s} checkedAt={report.checkedAt} status={marks.stubs[s.key] ?? 'to-book'} />
        ))}
      </div>
    </div>
  )
}

/* ── Pace setting ── */

export function PaceControl({ pace, dayStart, onApply, disabled }: {
  pace: TripPace; dayStart: string; onApply: (pace: TripPace, dayStart: string) => void; disabled: boolean
}) {
  return (
    <form
      className="flex items-center flex-wrap"
      style={{ gap: 8, fontSize: 11.5, color: cream(0.6) }}
      onSubmit={(e) => {
        e.preventDefault()
        const f = new FormData(e.currentTarget)
        onApply(f.get('pace') as TripPace, String(f.get('dayStart') || '09:00'))
      }}
    >
      <label className="flex items-center" style={{ gap: 6 }}>
        Pace
        <select name="pace" defaultValue={pace} style={{ background: '#201209', color: '#f2ead8', border: `1px solid ${cream(0.25)}`, borderRadius: 999, padding: '5px 10px' }}>
          <option value="slow">Slow</option>
          <option value="balanced">Balanced</option>
          <option value="full">Full</option>
        </select>
      </label>
      <label className="flex items-center" style={{ gap: 6 }}>
        Start
        <input type="time" name="dayStart" defaultValue={dayStart} style={{ background: '#201209', color: '#f2ead8', border: `1px solid ${cream(0.25)}`, borderRadius: 999, padding: '4px 10px', colorScheme: 'dark' }} />
      </label>
      <button type="submit" disabled={disabled} className="pill-gold rounded-full font-bold disabled:opacity-40" style={{ padding: '6px 14px', fontSize: 11.5 }}>
        Apply & regenerate
      </button>
    </form>
  )
}
