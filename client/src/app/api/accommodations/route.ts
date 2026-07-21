import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { TripContext, AccommodationSuggestion, PriceRange } from '@/lib/types'
import { generateId } from '@/lib/utils'
import { rateLimit } from '@/lib/api-guard'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function buildBookingUrl(destination: string, startDate: string, endDate: string, pax: number): string {
  const params = new URLSearchParams({
    ss: destination,
    checkin: startDate,
    checkout: endDate,
    group_adults: String(pax),
  })
  return `https://www.booking.com/searchresults.html?${params}`
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 'accommodations', 10)
  if (limited) return limited

  const body = await req.json()
  const trip: TripContext = body.trip

  if (!trip?.destination || !trip.priceRange) {
    return NextResponse.json({ error: 'Trip details required' }, { status: 400 })
  }

  const priceDesc: Record<PriceRange, string> = {
    budget: 'budget-friendly under $80/night',
    mid: 'mid-range $80-250/night',
    luxury: 'luxury above $250/night',
  }

  const ageContext = trip.ageRanges.length
    ? `Travellers include: ${trip.ageRanges.join(', ')}.`
    : ''

  const prompt = `You are a travel expert. Recommend 4 specific accommodation options for this trip:

Destination: ${trip.destination}, ${trip.country}
Dates: ${trip.startDate} to ${trip.endDate}
Travellers: ${trip.paxCount} people. ${ageContext}
Trip goals: ${trip.objectives.join(', ')}
Budget: ${priceDesc[trip.priceRange]}

Return ONLY a valid JSON array (no markdown, no explanation) with exactly 4 items in this format:
[
  {
    "name": "Hotel Name",
    "type": "hotel|hostel|villa|ryokan|resort|apartment|boutique",
    "description": "2-sentence description",
    "whyItFits": "1-2 sentences on why it suits this specific trip profile",
    "priceTier": "budget|mid|luxury",
    "estimatedPricePerNight": "$XX-$XX",
    "highlights": ["highlight1", "highlight2", "highlight3"]
  }
]

Be specific — use real property names if you know them, or highly plausible properties for this destination.`

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) throw new Error('No JSON array in response')

    const raw = JSON.parse(jsonMatch[0]) as Array<Record<string, unknown>>

    const suggestions: AccommodationSuggestion[] = raw.map((item) => ({
      id: generateId(),
      name: String(item.name ?? ''),
      type: (item.type ?? 'hotel') as AccommodationSuggestion['type'],
      description: String(item.description ?? ''),
      whyItFits: String(item.whyItFits ?? ''),
      priceTier: (item.priceTier ?? trip.priceRange) as PriceRange,
      estimatedPricePerNight: String(item.estimatedPricePerNight ?? ''),
      highlights: Array.isArray(item.highlights) ? item.highlights.map(String) : [],
      bookingUrl: buildBookingUrl(
        `${item.name} ${trip.destination}`,
        trip.startDate,
        trip.endDate,
        trip.paxCount
      ),
    }))

    return NextResponse.json({ suggestions })
  } catch (err) {
    console.error('Accommodations error:', err)
    return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 })
  }
}
