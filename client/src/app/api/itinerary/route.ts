import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { TripContext, GeneratedItinerary, ItineraryDay, TripPace, BookedFlight, TripDiscovery, TripStay } from '@/lib/types'
import { getDayCount } from '@/lib/utils'
import { rateLimit, clamp } from '@/lib/api-guard'
import type { PlannerPin } from '@/lib/decide'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Two AI steps; allow well past the usual time so a slow day never cuts the request off
export const maxDuration = 300

const PACE_STOPS: Record<TripPace, string> = {
  slow: '2–3 stops a day (meals not counted), long unhurried gaps',
  balanced: '3–4 stops a day (meals not counted)',
  full: '5–6 stops a day (meals not counted), still with one rest block',
}

const DISCOVERY_MIX: Record<TripDiscovery, string> = {
  0: 'famous must-sees only: the icons a first-timer would regret missing',
  1: 'mostly well-known highlights, with one local favourite a day',
  2: 'an even mix of famous highlights and lesser-known local spots',
  3: 'mostly hidden gems and neighbourhood spots locals love, with at most one famous sight a day',
  4: 'hidden gems only: skip the famous tourist sights and their crowds, choose places most visitors miss',
}

/** Business rules the model may skip: every day keeps a rest block and an anchor */
function enforcePace(day: ItineraryDay): ItineraryDay {
  const all = [...(day.morning ?? []), ...(day.afternoon ?? []), ...(day.evening ?? [])]
  const out = { ...day, afternoon: day.afternoon ?? [] }
  // No afternoon means the day was cut short (e.g. a morning flight home), so a 2 PM rest block would be wrong
  if (!all.some((b) => b.category === 'rest') && out.afternoon.length > 0) {
    out.afternoon = [
      { time: out.afternoon[0]?.time ?? '2:00 PM', activity: 'Rest block', place: 'Café or hotel near the next stop', duration: '1 hour', category: 'rest', notes: 'Protected downtime — keep it.' },
      ...out.afternoon,
    ]
  }
  if (!out.anchor?.trim()) out.anchor = all.find((b) => b.category === 'activity')?.activity
  return out
}

type Block = ItineraryDay['morning'][number]

/** Keep only cardIds that are on the board, so a made-up id never shows as a broken link */
function linkPins(day: ItineraryDay, ids: Set<string>): ItineraryDay {
  const fix = (blocks?: Block[]) =>
    (blocks ?? []).map(({ cardId, ...b }) => (cardId && ids.has(cardId) ? { ...b, cardId } : b))
  return { ...day, morning: fix(day.morning), afternoon: fix(day.afternoon), evening: fix(day.evening) }
}

/** "9:30 AM" / "21:05" → minutes after midnight, or null if it isn't a clock time */
function toMinutes(t: string | undefined): number | null {
  const m = (t ?? '').trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)
  if (!m) return null
  let h = Number(m[1]) % 24
  const min = Number(m[2] ?? 0)
  const ap = m[3]?.toLowerCase()
  if (ap === 'pm' && h < 12) h += 12
  if (ap === 'am' && h === 12) h = 0
  return h * 60 + min
}

function clock(min: number): string {
  const m = ((min % 1440) + 1440) % 1440
  const h = Math.floor(m / 60)
  return `${h % 12 || 12}:${String(m % 60).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

/**
 * Flights are fixed: nothing before landing + 2h on arrival day, nothing after the airport run on
 * departure day (at the airport 3h before an international flight, 1h to get there). The model is
 * told this too; this makes it true even when it isn't followed.
 */
function fitAroundFlights(day: ItineraryDay, flights: BookedFlight[]): ItineraryDay {
  const landing = flights.find((f) => f.leg !== 'return' && f.arriveAt.slice(0, 10) === day.date)
  const leaving = flights.find((f) => f.leg !== 'outbound' && f.departAt.slice(0, 10) === day.date)
  if (!landing && !leaving) return day

  const startMin = landing ? (toMinutes(landing.arriveAt.slice(11)) ?? 0) + 120 : 0
  const endMin = leaving ? (toMinutes(leaving.departAt.slice(11)) ?? 1440) - 240 : 1440
  const keep = (b: Block) => {
    const t = toMinutes(b.time)
    return t === null || (t >= startMin && t < endMin)
  }
  const blocks: Block[] = [...(day.morning ?? []), ...(day.afternoon ?? []), ...(day.evening ?? [])].filter(keep)

  if (landing) {
    const at = toMinutes(landing.arriveAt.slice(11)) ?? 0
    blocks.unshift({
      time: clock(at), activity: `Land ${landing.flightNo}`.trim(), place: `${landing.to} airport`,
      duration: '2 hours', category: 'transport', notes: 'Immigration, bags and the transfer in. Nothing else is planned before this.',
    })
  }
  if (leaving) {
    const dep = toMinutes(leaving.departAt.slice(11)) ?? 1440
    blocks.push({
      time: clock(dep - 240), activity: `Head to the airport for ${leaving.flightNo}`.trim(), place: `${leaving.from} airport`,
      duration: '1 hour', category: 'transport', notes: `Be at the airport by ${clock(dep - 180)}, 3 hours before the ${clock(dep)} departure.`,
    })
  }

  const slot = (b: Block) => {
    const t = toMinutes(b.time) ?? 12 * 60
    return t < 12 * 60 ? 'morning' : t < 17 * 60 ? 'afternoon' : 'evening'
  }
  return {
    ...day,
    morning: blocks.filter((b) => slot(b) === 'morning'),
    afternoon: blocks.filter((b) => slot(b) === 'afternoon'),
    evening: blocks.filter((b) => slot(b) === 'evening'),
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  // One-day fixes are small and frequent, so they get their own, larger allowance
  const limited = body.fixDay ? rateLimit(req, 'itinerary-fix', 40) : rateLimit(req, 'itinerary', 10)
  if (limited) return limited

  const { trip }: { trip: TripContext } = body

  if (!trip?.destination || !trip.startDate || !trip.endDate) {
    return NextResponse.json({ error: 'Trip details required' }, { status: 400 })
  }

  const days = Math.max(1, getDayCount(trip.startDate, trip.endDate))
  if (days > 30) {
    return NextResponse.json({ error: 'Trips longer than 30 days aren’t supported yet — split it into legs.' }, { status: 400 })
  }

  // Pins arrive with their plan choice and context; skipped pins are never sent
  const pins: PlannerPin[] = (Array.isArray(body.pins) ? body.pins as PlannerPin[] : [])
    .filter((p) => p && typeof p.id === 'string' && (p.priority === 'must' || p.priority === 'maybe'))
    .slice(0, 60)
    .map((p) => ({
      id: clamp(p.id, 40).replace(/[^\w-]/g, ''),
      name: clamp(p.name, 160),
      priority: p.priority,
      description: clamp(p.description, 200),
      tags: (Array.isArray(p.tags) ? p.tags : []).slice(0, 6).map((t) => clamp(t, 30)),
    }))
    .filter((p) => p.id && p.name.trim())
  const pinIds = new Set(pins.map((p) => p.id))
  const pinLine = (p: PlannerPin) =>
    `[${p.id}] ${p.name}${p.description ? ` — ${p.description}` : ''}${p.tags?.length ? ` (${p.tags.join(', ')})` : ''}`
  const mustGo = pins.filter((p) => p.priority === 'must').map(pinLine)
  const maybePins = pins.filter((p) => p.priority === 'maybe')
  const maybe = maybePins.map(pinLine)
  const savedPlaces = [...mustGo, ...maybe]
  const boardNotes = clamp((Array.isArray(body.notes) ? body.notes : []).map((n: unknown) => clamp(n, 200)).join(' | '), 600)
  const instructions = clamp(body.instructions, 600)
  const DT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/
  const flightList = (Array.isArray(body.flights) ? body.flights as BookedFlight[] : [])
    .filter((f) => DT.test(String(f?.departAt)) && DT.test(String(f?.arriveAt)))
    .slice(0, 6)
    .map((f) => ({ ...f, flightNo: clamp(f.flightNo, 12), from: clamp(f.from, 40), to: clamp(f.to, 40) }))
  const flights = flightList
    .map((f) => `  • ${f.leg === 'return' ? 'Return' : f.leg === 'outbound' ? 'Outbound' : 'Flight'} ${clamp(f.flightNo, 12)} ${clamp(f.from, 40)} → ${clamp(f.to, 40)}: departs ${f.departAt.replace('T', ' ')}, arrives ${f.arriveAt.replace('T', ' ')} (local times)`)
  const ISO = /^\d{4}-\d{2}-\d{2}$/
  const stays: TripStay[] = (Array.isArray(body.stays) ? body.stays as TripStay[] : [])
    .filter((s) => ISO.test(String(s?.checkIn)) && ISO.test(String(s?.checkOut)) && clamp(s?.name, 120).trim())
    .slice(0, 12)
    .map((s) => ({ id: String(s.id), name: clamp(s.name, 120), area: clamp(s.area, 80) || undefined, checkIn: s.checkIn, checkOut: s.checkOut }))
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn))
  const stayLabel = (s: TripStay) => `${s.name}${s.area ? ` (near ${s.area})` : ''}`
  /** Where they wake up and where they sleep on a date; differ on a hotel-change day */
  const staysOn = (date: string) => ({
    from: stays.find((s) => s.checkIn < date && date <= s.checkOut),
    to: stays.find((s) => s.checkIn <= date && date < s.checkOut),
  })
  const pace: TripPace = (['slow', 'balanced', 'full'] as const).find((p) => p === trip.pace) ?? 'balanced'
  const dayStart = /^\d{1,2}:\d{2}$/.test(trip.dayStart ?? '') ? trip.dayStart : '09:00'
  const discovery: TripDiscovery = ([0, 1, 2, 3, 4] as const).find((d) => d === trip.discovery) ?? 2
  const homeBase = clamp(trip.homeBase, 120).trim()
  const ageContext = trip.ageRanges.length
    ? `Group includes: ${trip.ageRanges.join(', ')}.`
    : 'Adults only.'

  // Is the board sparse relative to the trip length?
  const sparseBoard = !savedPlaces?.length || savedPlaces.length < Math.max(3, Math.ceil(days / 2))

  const fillHint = sparseBoard
    ? `\nThe board is light for a ${days}-day trip: add well-known attractions, local restaurants and authentic experiences in ${trip.destination} so every day is full.`
    : ''
  const placesContext = savedPlaces.length
    ? `${mustGo.length ? `MUST-GO PLACES (every one goes in the plan):\n${mustGo.map((p) => `  • ${p}`).join('\n')}\n` : ''}${maybe.length ? `\nIF THEY FIT (optional; choose only the ones that suit the route, pace and variety, and leave the rest out; never stack similar spots, e.g. no more than one ramen place a day):\n${maybe.map((p) => `  • ${p}`).join('\n')}\n` : ''}${fillHint}`
    : `No specific places have been saved yet. Design a complete ${days}-day itinerary featuring ${trip.destination}'s top attractions, local dining, and authentic experiences.`
  const pinRule = savedPlaces.length
    ? `- Saved places carry an id in [brackets]: write them in stops as "[id] Name" so they stay linked`
    : ''

  const tripBrief = `TRIP DETAILS:
- Destination: ${trip.destination}, ${trip.country}
- Dates: ${trip.startDate} to ${trip.endDate} (${days} days)
- Travellers: ${trip.paxCount} people. ${ageContext}
- Goals: ${trip.objectives.join(', ')}
- Budget: ${trip.priceRange}
- Pace: ${pace} — ${PACE_STOPS[pace]}. Days start around ${dayStart}.
- Added places (not the saved ones): ${DISCOVERY_MIX[discovery]}
${homeBase ? `- Home base: ${homeBase}. Every day starts and ends here (except arrival and departure legs). First block of the day is travel from the base, last block is the way back, with real travel times. Keep each day's stops within easy reach of the base or along one line out and back.
` : ''}${stays.length ? `
WHERE THEY'RE STAYING (fixed; each day starts and ends at that night's stay, routes from its nearest station):
${stays.map((s) => `  • ${s.checkIn} to ${s.checkOut}: ${stayLabel(s)}`).join('\n')}
- Plan each day's stops around that night's stay; on a day they change hotels, include check-out, the move (luggage: station lockers or same-day hotel forwarding) and check-in
` : ''}${flights.length ? `
BOOKED FLIGHTS (fixed, plan around them):
${flights.join('\n')}
- Arrival day: nothing before landing + 2 hours (immigration, transfer, bag drop); keep that evening light
- Departure day: be at the airport 3 hours before an international departure, plus travel time; no activities after that
` : ''}${boardNotes ? `\nTRAVELLER'S BOARD NOTES (respect these): ${boardNotes}\n` : ''}${instructions?.trim() ? `\nTRAVELLER'S SPECIAL REQUESTS (high priority — shape the whole plan around these):\n${instructions.trim()}\n` : ''}`

  const paceRules = `PACE RULES (non-negotiable):
- Every day has exactly ONE "anchor" (the thing that matters most); everything else is a bonus
- Every day has at least one block with category "rest" (café, hotel break, onsen, park) of 1 hour or more
- At most 3 "transport" blocks per day
- Day 1 (arrival) evening stays light; the last day is lighter and leaves 3+ hours before an international flight
- A theme-park or very long day gets a slow morning before and a light day after
- A bus or train with 4 or fewer departures a day is a FIXED departure: build the day around it and say so in notes`

  // Step 1: a short plan for the whole trip, so days written in parallel don't repeat or clash
  const planPrompt = `You are an expert travel planner. Plan the shape of a ${days}-day trip: which area and which stops go on which day. Details come later.

${tripBrief}
${placesContext}

Rules:
- Every must-go place appears on exactly one day; optional places only where they fit; never repeat a stop across days
- Group nearby places on the same day; the route should feel geographic
- Number of stops per day follows the pace; fill gaps with well-chosen local spots per the "added places" mix
${pinRule}

${paceRules}
- Estimate a realistic per-person daily cost (activities + meals + local transport, no accommodation) for the ${trip.priceRange} tier, in Singapore dollars (S$)

Return ONLY valid JSON:
{"overview":"2-3 sentence trip summary","generalTips":["tip","tip","tip"],"totalEstimatedCost":"~S$XX–XX per person / day",
 "days":[{"day":1,"date":"YYYY-MM-DD","theme":"Day theme","area":"Neighbourhood(s)","anchor":"The one thing that matters today","stops":["Place, in visiting order"],"backups":{"rain":"Indoor alternative","tired":"Low-effort alternative"}}]}`

  type PlanDay = { day: number; date: string; theme: string; area?: string; anchor?: string; stops?: string[]; backups?: ItineraryDay['backups'] }
  type Plan = { overview?: string; generalTips?: string[]; totalEstimatedCost?: string; days: PlanDay[] }

  async function ask<T>(model: string, maxTokens: number, prompt: string): Promise<T> {
    const response = await client.messages.create({ model, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] })
    const text = response.content[0]?.type === 'text' ? response.content[0].text : ''
    try { return JSON.parse(text) as T } catch {
      const match = text.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('AI did not return valid JSON. Try regenerating.')
      return JSON.parse(match[0]) as T
    }
  }

  function flightNote(date: string): string {
    const landing = flightList.find((f) => f.leg !== 'return' && f.arriveAt.slice(0, 10) === date)
    const leaving = flightList.find((f) => f.leg !== 'outbound' && f.departAt.slice(0, 10) === date)
    const at = (dt: string) => clock(toMinutes(dt.slice(11)) ?? 0)
    return [
      landing && `\n- ARRIVAL DAY: ${landing.flightNo} lands at ${at(landing.arriveAt)}. Plan nothing before ${clock((toMinutes(landing.arriveAt.slice(11)) ?? 0) + 120)} (immigration, bags, transfer); keep the rest light`,
      leaving && `\n- DEPARTURE DAY: ${leaving.flightNo} departs ${at(leaving.departAt)}. Leave for the airport by ${clock((toMinutes(leaving.departAt.slice(11)) ?? 1440) - 240)}; plan nothing after that`,
    ].filter(Boolean).join('')
  }

  function stayNote(date: string): string {
    const { from, to } = staysOn(date)
    if (!from && !to) return ''
    if (from && to && from.id !== to.id) {
      return `\n- HOTEL CHANGE: check out of ${stayLabel(from)}, move to ${stayLabel(to)}. Include check-out, the move (say how luggage gets there) and check-in; keep the day light`
    }
    const base = (to ?? from)!
    return `\n- STAYING AT: ${stayLabel(base)}. Start the day from here and end back here; name the nearest station and the line for the first and last legs`
  }

  // Step 2: one day, in full detail, following its slot in the plan
  function dayPrompt(d: PlanDay, plan: Plan): string {
    const others = plan.days.filter((x) => x.day !== d.day).map((x) => `Day ${x.day}: ${(x.stops ?? []).join(', ')}`).join('\n')
    return `You are an expert travel planner. Write day ${d.day} of ${days} of this trip in full detail.

${tripBrief}
THIS DAY'S PLAN:
- Date: ${d.date}${flightNote(d.date)}${stayNote(d.date)}
- Theme: ${d.theme}${d.area ? `\n- Area: ${d.area}` : ''}
- Anchor: ${d.anchor ?? 'pick the one thing that matters most'}
- Stops, in order: ${(d.stops ?? []).join(', ') || 'choose fitting local spots'}

OTHER DAYS (don't use these stops today):
${others || 'none'}

Rules:
- Morning, afternoon and evening blocks with specific times, starting around ${dayStart}${d.day === 1 ? ' (or after arrival)' : ''}
- Add travel time between stops (walking or transit), meals timed around activities, booking flags and best visiting times
- A block that visits a stop marked [id] sets "cardId" to that id; other blocks leave it out

${paceRules}
- Estimate a realistic per-person cost for the day in S$

Return ONLY valid JSON for this one day:
{"day":${d.day},"date":"${d.date}","theme":"${d.theme.replace(/"/g, "'")}","estimatedCost":"~S$XX pp",
 "morning":[{"time":"9:00 AM","activity":"Activity name","place":"Specific place/address","duration":"2 hours","notes":"Optional note","bookingRequired":false,"category":"activity|meal|transport|rest","cardId":"id, only for a saved place"}],
 "afternoon":[],"evening":[],
 "meals":{"breakfast":"suggestion","lunch":"suggestion","dinner":"suggestion"},
 "travelTips":["tip for this day"],
 "anchor":"The one thing that matters today","backups":{"rain":"Indoor alternative","tired":"Low-effort alternative"}}`
  }

  const hasBackups = (b: ItineraryDay['backups']) => !!(b?.rain?.trim() && b?.tired?.trim())

  // One-day fix (Reality Check "Fix", refine bar, swap-in): rewrite only this day from its current version
  const fix = body.fixDay as { day?: unknown; instructions?: unknown } | undefined
  const current: ItineraryDay[] = Array.isArray(body.itinerary?.days) ? body.itinerary.days : []
  if (fix && current.length) {
    const target = current.find((d) => d.day === Number(fix.day))
    const change = clamp(fix.instructions, 400).trim()
    if (!target || !change) return NextResponse.json({ error: 'Pick a day and a change to make' }, { status: 400 })
    const stopsOf = (d: ItineraryDay) => [...(d.morning ?? []), ...(d.afternoon ?? []), ...(d.evening ?? [])]
      .filter((b) => b.category === 'activity' || b.category === 'meal').map((b) => clamp(b.place || b.activity, 60))
    const others = current.filter((d) => d.day !== target.day).map((d) => `Day ${d.day}: ${stopsOf(d).join(', ')}`).join('\n')
    const prompt = `You are an expert travel planner. Make one change to day ${target.day} of ${days} of this trip: "${change}".

${tripBrief}
DAY ${target.day} AS IT IS NOW (JSON):
${JSON.stringify({ ...target, travelTips: target.travelTips?.slice(0, 3) }).slice(0, 7000)}
${flightNote(target.date)}${stayNote(target.date)}

OTHER DAYS (don't use these stops):
${others || 'none'}
${savedPlaces.length ? `
SAVED PLACES (id in brackets):
${savedPlaces.map((p) => `  • ${p}`).join('\n')}
` : ''}
Rules:
- Make the change asked for; keep every other part of the day that doesn't need to move
- Keep each block's "cardId"; a block that visits a saved place sets "cardId" to its id
- Keep times realistic, with travel time between stops
${paceRules}
- Always return an anchor and both backups (rain and tired)

Return ONLY valid JSON for this one day, in the same shape as the day above, including "anchor" and "backups".`
    try {
      const day = await ask<ItineraryDay>('claude-haiku-4-5', 3000, prompt)
      const fixed = linkPins(enforcePace(fitAroundFlights({
        ...day,
        day: target.day,
        date: target.date,
        theme: day.theme || target.theme,
        anchor: day.anchor?.trim() ? day.anchor : target.anchor,
        backups: hasBackups(day.backups) ? day.backups : target.backups,
        meals: day.meals ?? target.meals,
        travelTips: day.travelTips ?? target.travelTips,
      }, flightList)), pinIds)
      return NextResponse.json({ day: fixed })
    } catch (err) {
      console.error('Day fix error:', err)
      return NextResponse.json({ error: err instanceof Error ? err.message : 'Couldn’t change that day. Try again.' }, { status: 500 })
    }
  }

  try {
    const t0 = Date.now()
    // Haiku for both steps: the plan is short and structured, and speed is what keeps this under a minute
    const plan = await ask<Plan>('claude-haiku-4-5', 3000, planPrompt)
    const planMs = Date.now() - t0
    if (!Array.isArray(plan.days) || plan.days.length === 0) {
      throw new Error('Itinerary plan came back empty. Try regenerating.')
    }
    const planDays = plan.days.slice(0, days)

    // All days at once: total time is the plan plus the slowest single day, not the sum of them
    const writeDay = (d: PlanDay) => ask<ItineraryDay>('claude-haiku-4-5', 3000, dayPrompt(d, plan))
    const detailed = await Promise.all(planDays.map(async (d) => {
      let day: ItineraryDay
      try { day = await writeDay(d) } catch { day = await writeDay(d) } // one retry per day
      return linkPins(enforcePace(fitAroundFlights({
        ...day,
        day: d.day,
        date: d.date || day.date,
        theme: d.theme || day.theme,
        anchor: d.anchor || day.anchor,
        backups: hasBackups(d.backups) ? d.backups : day.backups,
      }, flightList)), pinIds)
    }))

    console.log(`Itinerary timing: ${days} days, plan ${planMs}ms, total ${Date.now() - t0}ms`)

    const itinerary: GeneratedItinerary = {
      tripId: trip.id,
      destination: trip.destination,
      totalDays: days,
      overview: plan.overview ?? '',
      days: detailed,
      generalTips: plan.generalTips ?? [],
      totalEstimatedCost: plan.totalEstimatedCost,
      // Left out = an optional pin no block links to
      unusedPins: maybePins
        .filter((p) => !detailed.some((d) => [...(d.morning ?? []), ...(d.afternoon ?? []), ...(d.evening ?? [])].some((b) => b.cardId === p.id)))
        .map((p) => p.name.split(',')[0].trim())
        .slice(0, 30),
    }

    return NextResponse.json({ itinerary })
  } catch (err) {
    console.error('Itinerary error:', err)
    const message = err instanceof Error ? err.message : 'Failed to generate itinerary'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
