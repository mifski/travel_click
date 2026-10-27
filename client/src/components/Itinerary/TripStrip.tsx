'use client'

import type { ItineraryDay, RealityReport, RealityMarks, TripPace } from '@/lib/types'
import type { DayReality } from '@/lib/reality'
import { daysUntil, stubDeadline } from '@/lib/reality'
import { PACE_MAX_STOPS } from '@/lib/decide'

const cream = (a: number) => `rgba(242,234,216,${a})`
const GOLD = '#c9a84c'
const CORAL = '#e0705f'
const GREEN = '#8fbf7a'

const blocksOf = (d: ItineraryDay) => [...(d.morning ?? []), ...(d.afternoon ?? []), ...(d.evening ?? [])]

/** "Thu 15" from YYYY-MM-DD, without the viewer's time zone shifting the day */
function shortDate(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', timeZone: 'UTC' })
}

interface Props {
  days: ItineraryDay[]
  realities: DayReality[]
  activeDay: number
  onDayChange: (idx: number) => void
  pace: TripPace
  report?: RealityReport
  marks: RealityMarks
  checking: boolean
}

/**
 * The whole trip at a glance and the day navigation in one row of luggage tags:
 * date, anchor, how full the day is, its check status and the next booking deadline.
 */
export function TripStrip({ days, realities, activeDay, onDayChange, pace, report, marks, checking }: Props) {
  const maxStops = PACE_MAX_STOPS[pace]

  return (
    <nav aria-label="Trip days" className="swipe-row" style={{ gap: 10, padding: '20px var(--gutter) 6px' }}>
      {days.map((d, i) => {
        const active = i === activeDay
        const r = realities[i]
        const pending = checking || r.pending
        const edge = pending ? cream(0.25) : r.checked ? GREEN : CORAL
        const fixes = r.findings.filter((f) => f.severity === 'fix').length
        const stops = blocksOf(d).filter((b) => b.category === 'activity').length
        const fill = Math.min(1, stops / maxStops)
        const over = stops > maxStops

        const toBook = report?.stubs.filter((s) => s.day === d.day && (marks.stubs[s.key] ?? 'to-book') === 'to-book') ?? []
        const next = report && toBook.length
          ? Math.min(...toBook.map((s) => daysUntil(stubDeadline(s, report.checkedAt))))
          : null

        // Not checked with nothing to fix means facts are still unconfirmed
        const status = pending ? 'Checking…' : r.checked ? 'Checked' : fixes ? `${fixes} to fix` : 'Facts to confirm'
        return (
          <button
            key={d.day}
            type="button"
            onClick={() => onDayChange(i)}
            aria-current={active ? 'page' : undefined}
            aria-label={`Day ${d.day}, ${shortDate(d.date)}: ${d.theme}. ${stops} stops, ${status}${next !== null ? `, next booking in ${next} days` : ''}`}
            title={d.theme}
            className="text-left transition-colors"
            style={{
              width: 168, minHeight: 92, padding: '10px 12px 10px 14px', borderRadius: 8, cursor: 'pointer',
              background: active ? '#f2ead8' : 'rgba(242,234,216,.06)',
              color: active ? '#2c1810' : '#f2ead8',
              // Longhands only: mixing `border` with `borderLeft` misrenders when the active tag changes
              borderStyle: 'solid',
              borderWidth: '1px 1px 1px 4px',
              borderColor: `${active ? '#f2ead8' : cream(0.14)} ${active ? '#f2ead8' : cream(0.14)} ${active ? '#f2ead8' : cream(0.14)} ${edge}`,
            }}
          >
            <span className="flex items-baseline justify-between" style={{ gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.12em', color: active ? '#a86030' : GOLD }}>
                DAY {d.day}
              </span>
              <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.75 }}>{shortDate(d.date)}</span>
            </span>
            <span
              className="block truncate font-display"
              style={{ fontSize: 14, fontWeight: 700, marginTop: 3, lineHeight: 1.25 }}
            >
              {d.anchor?.trim() || d.theme}
            </span>
            {/* Fullness: activity stops against the pace's top count */}
            <span aria-hidden="true" className="block" style={{ height: 4, borderRadius: 2, marginTop: 8, background: active ? 'rgba(44,24,16,.12)' : cream(0.12) }}>
              <span className="block" style={{ height: 4, borderRadius: 2, width: `${fill * 100}%`, background: over ? CORAL : active ? '#a86030' : GOLD }} />
            </span>
            <span className="flex items-center justify-between" style={{ marginTop: 6, fontSize: 11, fontWeight: 600, gap: 6 }}>
              <span style={{ color: pending ? undefined : r.checked ? (active ? '#4f7a3f' : GREEN) : (active ? '#b0412f' : CORAL), opacity: pending ? 0.6 : 1 }}>
                {status}
              </span>
              {next !== null && (
                <span style={{ opacity: 0.8 }}>{next < 0 ? 'book: late' : next === 0 ? 'book today' : `book in ${next}d`}</span>
              )}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
