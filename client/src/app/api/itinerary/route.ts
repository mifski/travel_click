import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { TripContext, GeneratedItinerary, ItineraryDay, TripPace, BookedFlight, TripDiscovery } from '@/lib/types'
import { getDayCount } from '@/lib/utils'
import { rateLimit, clamp } from '@/lib/api-guard'

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

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 'itinerary', 10)
  if (limited) return limited

  const body = await req.json()
  const { trip }: { trip: TripContext } = body

  if (!trip?.destination || !trip.startDate || !trip.endDate) {
    return NextResponse.json({ error: 'Trip details required' }, { status: 400 })
  }

  const days = Math.max(1, getDayCount(trip.startDate, trip.endDate))
  if (days > 30) {
    return NextResponse.json({ error: 'Trips longer than 30 days aren’t supported yet — split it into legs.' }, { status: 400 })
  }

  const savedPlaces: string[] = (Array.isArray(body.savedPlaces) ? body.savedPlaces : [])
    .slice(0, 60)
    .map((p: unknown) => clamp(p, 160))
  const instructions = clamp(body.instructions, 600)
  const DT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/
  const flights = (Array.isArray(body.flights) ? body.flights as BookedFlight[] : [])
    .filter((f) => DT.test(String(f?.departAt)) && DT.test(String(f?.arriveAt)))
    .slice(0, 6)
    .map((f) => `  • ${f.leg === 'return' ? 'Return' : f.leg === 'outbound' ? 'Outbound' : 'Flight'} ${clamp(f.flightNo, 12)} ${clamp(f.from, 40)} → ${clamp(f.to, 40)}: departs ${f.departAt.replace('T', ' ')}, arrives ${f.arriveAt.replace('T', ' ')} (local times)`)
  const pace: TripPace = (['slow', 'balanced', 'full'] as const).find((p) => p === trip.pace) ?? 'balanced'
  const dayStart = /^\d{1,2}:\d{2}$/.test(trip.dayStart ?? '') ? trip.dayStart : '09:00'
  const discovery: TripDiscovery = ([0, 1, 2, 3, 4] as const).find((d) => d === trip.discovery) ?? 2
  const homeBase = clamp(trip.homeBase, 120).trim()
  const ageContext = trip.ageRanges.length
    ? `Group includes: ${trip.ageRanges.join(', ')}.`
    : 'Adults only.'

  // Is the board sparse relative to the trip length?
  const sparseBoard = !savedPlaces?.length || savedPlaces.length < Math.max(3, Math.ceil(days / 2))

  let placesContext = ''
  if (savedPlaces?.length) {
    const list = savedPlaces.map(p => `  • ${p}`).join('\n')
    placesContext = `SAVED PLACES (must all be included):\n${list}\n`
    if (sparseBoard) {
      placesContext += `\nNote: Only ${savedPlaces.length} place(s) are saved for a ${days}-day trip. You MUST proactively add more well-known attractions, local restaurants, hidden gems, and authentic experiences in ${trip.destination} so every day is filled — don't just repeat the saved places.`
    }
  } else {
    placesContext = `No specific places have been saved yet. Design a complete ${days}-day itinerary featuring ${trip.destination}'s top attractions, local dining, and authentic experiences.`
  }

  const tripBrief = `TRIP DETAILS:
- Destination: ${trip.destination}, ${trip.country}
- Dates: ${trip.startDate} to ${trip.endDate} (${days} days)
- Travellers: ${trip.paxCount} people. ${ageContext}
- Goals: ${trip.objectives.join(', ')}
- Budget: ${trip.priceRange}
- Pace: ${pace} — ${PACE_STOPS[pace]}. Days start around ${dayStart}.
- Added places (not the saved ones): ${DISCOVERY_MIX[discovery]}
${homeBase ? `- Home base: ${homeBase}. Every day starts and ends here (except arrival and departure legs). First block of the day is travel from the base, last block is the way back, with real travel times. Keep each day's stops within easy reach of the base or along one line out and back.
` : ''}${flights.length ? `
BOOKED FLIGHTS (fixed, plan around them):
${flights.join('\n')}
- Arrival day: nothing before landing + 2 hours (immigration, transfer, bag drop); keep that evening light
- Departure day: be at the airport 3 hours before an international departure, plus travel time; no activities after that
` : ''}${instructions?.trim() ? `\nTRAVELLER'S SPECIAL REQUESTS (high priority — shape the whole plan around these):\n${instructions.trim()}\n` : ''}`

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
- Every saved place appears on exactly one day; never repeat a stop across days
- Group nearby places on the same day; the route should feel geographic
- Number of stops per day follows the pace; fill gaps with well-chosen local spots per the "added places" mix

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

  // Step 2: one day, in full detail, following its slot in the plan
  function dayPrompt(d: PlanDay, plan: Plan): string {
    const others = plan.days.filter((x) => x.day !== d.day).map((x) => `Day ${x.day}: ${(x.stops ?? []).join(', ')}`).join('\n')
    return `You are an expert travel planner. Write day ${d.day} of ${days} of this trip in full detail.

${tripBrief}
THIS DAY'S PLAN:
- Date: ${d.date}
- Theme: ${d.theme}${d.area ? `\n- Area: ${d.area}` : ''}
- Anchor: ${d.anchor ?? 'pick the one thing that matters most'}
- Stops, in order: ${(d.stops ?? []).join(', ') || 'choose fitting local spots'}

OTHER DAYS (don't use these stops today):
${others || 'none'}

Rules:
- Morning, afternoon and evening blocks with specific times, starting around ${dayStart}${d.day === 1 ? ' (or after arrival)' : ''}
- Add travel time between stops (walking or transit), meals timed around activities, booking flags and best visiting times

${paceRules}
- Estimate a realistic per-person cost for the day in S$

Return ONLY valid JSON for this one day:
{"day":${d.day},"date":"${d.date}","theme":"${d.theme.replace(/"/g, "'")}","estimatedCost":"~S$XX pp",
 "morning":[{"time":"9:00 AM","activity":"Activity name","place":"Specific place/address","duration":"2 hours","notes":"Optional note","bookingRequired":false,"category":"activity|meal|transport|rest"}],
 "afternoon":[],"evening":[],
 "meals":{"breakfast":"suggestion","lunch":"suggestion","dinner":"suggestion"},
 "travelTips":["tip for this day"]}`
  }

  try {
    const plan = await ask<Plan>('claude-sonnet-4-6', 4000, planPrompt)
    if (!Array.isArray(plan.days) || plan.days.length === 0) {
      throw new Error('Itinerary plan came back empty. Try regenerating.')
    }
    const planDays = plan.days.slice(0, days)

    // All days at once: total time is the plan plus the slowest single day, not the sum of them
    const writeDay = (d: PlanDay) => ask<ItineraryDay>('claude-haiku-4-5', 3000, dayPrompt(d, plan))
    const detailed = await Promise.all(planDays.map(async (d) => {
      let day: ItineraryDay
      try { day = await writeDay(d) } catch { day = await writeDay(d) } // one retry per day
      return enforcePace({
        ...day,
        day: d.day,
        date: d.date || day.date,
        theme: d.theme || day.theme,
        anchor: d.anchor || day.anchor,
        backups: d.backups ?? day.backups,
      })
    }))

    const itinerary: GeneratedItinerary = {
      tripId: trip.id,
      destination: trip.destination,
      totalDays: days,
      overview: plan.overview ?? '',
      days: detailed,
      generalTips: plan.generalTips ?? [],
      totalEstimatedCost: plan.totalEstimatedCost,
    }

    return NextResponse.json({ itinerary })
  } catch (err) {
    console.error('Itinerary error:', err)
    const message = err instanceof Error ? err.message : 'Failed to generate itinerary'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
