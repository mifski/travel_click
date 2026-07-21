import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { TripContext, PackingList, PackingCategory } from '@/lib/types'
import { getDayCount, generateId } from '@/lib/utils'
import { rateLimit } from '@/lib/api-guard'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 'packing', 10)
  if (limited) return limited

  const body = await req.json()
  const trip: TripContext = body.trip

  if (!trip?.destination) {
    return NextResponse.json({ error: 'Trip details required' }, { status: 400 })
  }

  const days = Math.min(60, Math.max(1, getDayCount(trip.startDate, trip.endDate)))
  const ageContext = trip.ageRanges.length ? `Group: ${trip.ageRanges.join(', ')}.` : 'Adults.'

  const prompt = `You are a travel-packing expert. Build a packing checklist for this trip:

- Destination: ${trip.destination}, ${trip.country}
- Dates: ${trip.startDate} to ${trip.endDate} (${days} days) — consider the typical weather/season there at that time of year
- Travellers: ${trip.paxCount} people. ${ageContext}
- Activities planned: ${trip.objectives.join(', ') || 'general sightseeing'}
- Budget style: ${trip.priceRange}

Return ONLY valid JSON (no markdown) in this exact structure:
{
  "categories": [
    {
      "name": "Category name",
      "icon": "single emoji",
      "items": [
        { "label": "Item (with quantity where useful, e.g. '4× t-shirts')", "note": "optional short why/tip" }
      ]
    }
  ]
}

Rules:
- Exactly these 5 categories in order: Documents & Money, Clothing, Tech & Gadgets, Toiletries & Health, Destination Extras.
- 4-8 items per category. Quantities scaled to ${days} days (assume laundry if > 7 days).
- "Destination Extras" must be specific to ${trip.destination}, the season, and the planned activities (${trip.objectives.join(', ') || 'sightseeing'}).
- Include age-specific items if infants/kids/seniors are in the group.
- Notes only where they add real value; omit the "note" key otherwise.`

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2500,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    let raw: { categories: Array<{ name: string; icon: string; items: Array<{ label: string; note?: string }> }> }
    try {
      raw = JSON.parse(text)
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('AI did not return valid JSON. Try again.')
      raw = JSON.parse(jsonMatch[0])
    }

    if (!Array.isArray(raw.categories) || raw.categories.length === 0) {
      throw new Error('Packing list response was incomplete. Try again.')
    }

    const categories: PackingCategory[] = raw.categories.map((cat) => ({
      name: String(cat.name ?? ''),
      icon: String(cat.icon ?? '🧳'),
      items: (cat.items ?? []).map((it) => ({
        id: generateId(),
        label: String(it.label ?? ''),
        note: it.note ? String(it.note) : undefined,
        checked: false,
      })),
    }))

    const list: PackingList = {
      tripId: trip.id,
      generatedAt: new Date().toISOString(),
      categories,
    }

    return NextResponse.json({ list })
  } catch (err) {
    console.error('Packing error:', err)
    const message = err instanceof Error ? err.message : 'Failed to generate packing list'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
