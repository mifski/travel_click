import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { TripContext, GeneratedItinerary, RealityReport, RealityFinding, RealityFact, BookingStub } from '@/lib/types'
import { rateLimit, clamp } from '@/lib/api-guard'
import { daySig } from '@/lib/reality'

export const maxDuration = 120

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const ISO = /^\d{4}-\d{2}-\d{2}$/
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
const weekday = (iso: string) =>
  ISO.test(iso) ? new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }) : '?'

type RawDay = { findings?: Partial<RealityFinding>[]; facts?: Partial<RealityFact>[]; stubs?: Partial<BookingStub>[] }

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 'reality-check', 12)
  if (limited) return limited

  const body = await req.json()
  const { trip, itinerary }: { trip: TripContext; itinerary: GeneratedItinerary } = body
  if (!trip?.destination || !Array.isArray(itinerary?.days) || !itinerary.days.length) {
    return NextResponse.json({ error: 'Trip and itinerary required' }, { status: 400 })
  }

  // Compact plan text — weekdays computed here so the model doesn't miscount closed days
  const days = itinerary.days.slice(0, 30)
  const dayTexts = days.map((d) => {
    const blocks = [...(d.morning ?? []), ...(d.afternoon ?? []), ...(d.evening ?? [])].slice(0, 15)
    const lines = blocks.map((b) =>
      `  ${clamp(b.time, 12)} ${clamp(b.activity, 80)} @ ${clamp(b.place, 100)} (${clamp(b.duration, 20)}, ${b.category}${b.bookingRequired ? ', booking' : ''})`)
    return `Day ${d.day} — ${clamp(d.date, 10)} (${weekday(d.date)}): ${clamp(d.theme, 80)}\n${lines.join('\n')}`
  })

  const today = new Date().toISOString().slice(0, 10)
  const where = `${clamp(trip.destination, 80)}, ${clamp(trip.country, 60)}`
  const promptFor = (i: number) => `You are the Reality Check for one day of a travel itinerary in ${where}. Today is ${today}. Find what would break ON THE GROUND.

${i > 0 ? `PREVIOUS DAY (context only, e.g. hotel changes):\n${dayTexts[i - 1]}\n\n` : ''}DAY TO CHECK:
${dayTexts[i]}

Check: transfer time between consecutive stops; places closed on that weekday or outside their hours at the planned time; last train/bus back; luggage moves (hotel changes, checkout days — suggest station lockers); services with 4 or fewer departures a day (call them FIXED); anything that needs booking.

Rules:
- Be terse: reason ≤ 25 words, fix ≤ 20 words, each fact ≤ 20 words
- severity "fix" = the day fails as written; "look" = risky, worth a look
- "fix" is ONE short instruction a planner can apply to the day (e.g. "Use a Kyoto Station coin locker instead of returning to the hotel")
- "facts": the 1–3 key facts the day depends on (opening hours, closed days, timetables, fares). Give an official sourceUrl only if you know the exact official site; never invent URLs
- "stubs": one per item that takes tickets or reservations ahead (never walk-in-only places). opensOn = when sales open, bookBy = latest sensible booking date (YYYY-MM-DD, before the visit). Give dates only if you have a real basis; otherwise omit them
- Do not repeat these (checked elsewhere): missing anchor, missing rest block, missing backups, transfer count
- Return no findings if the day is genuinely fine

Return ONLY valid JSON:
{"findings":[{"severity":"fix","reason":"plain reason","fix":"one-tap fix"}],
 "facts":[{"text":"Byodo-in opens 8:30–17:30 daily","sourceUrl":"https://..."}],
 "stubs":[{"item":"Arima Onsen direct bus (Kyoto → Arima)","opensOn":"YYYY-MM-DD","bookBy":"YYYY-MM-DD"}]}`

  async function checkDay(i: number): Promise<RawDay> {
    const response = await client.messages.create({
      // ponytail: Haiku for the 15s speed target; move to a bigger model if findings miss planted problems
      model: 'claude-haiku-4-5',
      max_tokens: 1500,
      messages: [{ role: 'user', content: promptFor(i) }],
    })
    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('Reality Check returned no result. Try again.')
    return JSON.parse(match[0])
  }

  try {
    // One call per day in parallel — total time ≈ the slowest single day
    // onlyDays: re-check just the days a fix changed; the client merges them into the old report
    const only = Array.isArray(body.onlyDays) ? (body.onlyDays as unknown[]).map(Number) : null
    const picked = days.map((d, i) => ({ d, i })).filter(({ d }) => !only || only.includes(d.day))
    const raw = await Promise.all(picked.map(({ i }) => checkDay(i)))

    const url = (u: unknown) => (typeof u === 'string' && /^https:\/\//.test(u) ? clamp(u, 300) : undefined)
    const date = (d: unknown) => (typeof d === 'string' && ISO.test(d) ? d : undefined)

    const report: RealityReport = {
      tripId: trip.id,
      checkedAt: new Date().toISOString(),
      days: raw.map((r, k) => {
        const day = picked[k].d.day
        return {
          day,
          sig: daySig(picked[k].d),
          // Every finding must carry a fix — drop any that don't
          findings: (r.findings ?? [])
            .filter((f) => f.reason && f.fix)
            .map((f) => ({ severity: f.severity === 'fix' ? 'fix' : 'look', reason: clamp(f.reason, 240), fix: clamp(f.fix, 240) })),
          facts: (r.facts ?? []).filter((f) => f.text).slice(0, 3).map((f) => ({
            key: `${day}:${slug(String(f.text))}`, text: clamp(f.text, 200), sourceUrl: url(f.sourceUrl),
          })),
        }
      }),
      // AI dates are never "sourced" — they show as estimated, or a check-again date when missing
      stubs: raw.flatMap((r, k) => (r.stubs ?? []).filter((s) => s.item).slice(0, 5).map((s): BookingStub => {
        const opensOn = date(s.opensOn), bookBy = date(s.bookBy)
        return {
          key: slug(String(s.item)), item: clamp(s.item, 120), day: picked[k].d.day,
          opensOn, bookBy, dateBasis: opensOn || bookBy ? 'estimated' : 'unknown', sourceUrl: url(s.sourceUrl),
        }
      })),
    }
    return NextResponse.json({ report })
  } catch (err) {
    console.error('Reality check error:', err)
    const message = err instanceof Error ? err.message : 'Reality Check failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
