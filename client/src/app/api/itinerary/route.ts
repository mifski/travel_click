import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { TripContext, GeneratedItinerary, ItineraryDay } from '@/lib/types'
import { getDayCount } from '@/lib/utils'
import { rateLimit, clamp } from '@/lib/api-guard'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 'itinerary', 6)
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

  const prompt = `You are an expert travel planner. Create a detailed ${days}-day itinerary for this trip.

TRIP DETAILS:
- Destination: ${trip.destination}, ${trip.country}
- Dates: ${trip.startDate} to ${trip.endDate} (${days} days)
- Travellers: ${trip.paxCount} people. ${ageContext}
- Goals: ${trip.objectives.join(', ')}
- Budget: ${trip.priceRange}

${placesContext}
${instructions?.trim() ? `\nTRAVELLER'S SPECIAL REQUESTS (high priority — shape the whole plan around these):\n${instructions.trim()}\n` : ''}
INSTRUCTIONS:
1. Each day has morning, afternoon, and evening blocks
2. Group nearby attractions on the same day to minimise travel
3. Pace activities for the age groups present — no rushed back-to-back
4. Include specific meal suggestions timed around activities
5. Add travel time estimates between stops (walking or transit)
6. Note if booking is required or if there are best visiting times
7. The route should feel logical and geographic
8. If saved places are fewer than ${Math.ceil(days * 1.5)} for ${days} days, fill remaining slots with highly-recommended local spots — famous landmarks, neighbourhood finds, and must-eat restaurants
9. Estimate a realistic per-person daily cost (activities + meals + local transport, excluding accommodation) for the ${trip.priceRange} budget tier

Return ONLY valid JSON (no markdown) in this exact structure:
{
  "overview": "2-3 sentence trip summary",
  "generalTips": ["tip1", "tip2", "tip3"],
  "totalEstimatedCost": "~$XX–XX per person / day",
  "days": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "theme": "Day theme/title",
      "estimatedCost": "~$XX pp",
      "morning": [
        {
          "time": "9:00 AM",
          "activity": "Activity name",
          "place": "Specific place/address",
          "duration": "2 hours",
          "notes": "Optional note",
          "bookingRequired": false,
          "category": "activity|meal|transport|rest"
        }
      ],
      "afternoon": [...],
      "evening": [...],
      "meals": {
        "breakfast": "suggestion",
        "lunch": "suggestion",
        "dinner": "suggestion"
      },
      "travelTips": ["tip for this day"]
    }
  ]
}`

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 16384,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    if (!text) throw new Error('Empty response from AI')

    let raw: { overview: string; generalTips: string[]; days: ItineraryDay[]; totalEstimatedCost?: string }
    try {
      raw = JSON.parse(text)
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('AI did not return valid JSON. Try regenerating.')
      raw = JSON.parse(jsonMatch[0])
    }

    if (!Array.isArray(raw.days) || raw.days.length === 0) {
      throw new Error('Itinerary response was incomplete. Try regenerating.')
    }

    const itinerary: GeneratedItinerary = {
      tripId: trip.id,
      destination: trip.destination,
      totalDays: days,
      overview: raw.overview ?? '',
      days: raw.days,
      generalTips: raw.generalTips ?? [],
      totalEstimatedCost: raw.totalEstimatedCost,
    }

    return NextResponse.json({ itinerary })
  } catch (err) {
    console.error('Itinerary error:', err)
    const message = err instanceof Error ? err.message : 'Failed to generate itinerary'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
