import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { TripContext, TravelBrief } from '@/lib/types'
import { rateLimit } from '@/lib/api-guard'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 'brief', 10)
  if (limited) return limited

  const body = await req.json()
  const trip: TripContext = body.trip

  if (!trip?.destination) {
    return NextResponse.json({ error: 'Trip details required' }, { status: 400 })
  }

  const prompt = `You are a seasoned travel expert. Create a concise destination brief for travellers visiting ${trip.destination}, ${trip.country} from ${trip.startDate} to ${trip.endDate}.

Return ONLY valid JSON (no markdown) in this exact structure:
{
  "currency": {
    "name": "Currency name",
    "code": "ISO code",
    "cashCulture": "1 sentence: how cash-vs-card friendly this place is",
    "exchangeTip": "1 practical sentence on getting/using money there"
  },
  "language": {
    "name": "Primary language",
    "phrases": [
      { "local": "phrase in local script", "english": "meaning", "phonetic": "simple pronunciation" }
    ]
  },
  "power": { "plugType": "e.g. Type A/B", "voltage": "e.g. 100V", "note": "1 short adapter tip" },
  "tipping": "1-2 sentences on tipping culture",
  "gettingAround": ["3-4 short practical transit tips"],
  "etiquette": { "dos": ["3 short dos"], "donts": ["3 short don'ts"] },
  "emergency": { "police": "number", "ambulance": "number", "note": "1 short safety sentence" },
  "neighbourhoods": [
    { "name": "Area name", "why": "1 short sentence why it's great for this trip" }
  ]
}

Rules:
- Exactly 6 phrases (hello, thank you, excuse me, how much, delicious, goodbye — or locally apt equivalents).
- Exactly 3 neighbourhoods, picked for these trip goals: ${trip.objectives.join(', ') || 'general sightseeing'} and budget: ${trip.priceRange}.
- Keep every sentence tight and practical. No fluff.`

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    let raw: Omit<TravelBrief, 'tripId' | 'destination' | 'generatedAt'>
    try {
      raw = JSON.parse(text)
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('AI did not return valid JSON. Try again.')
      raw = JSON.parse(jsonMatch[0])
    }

    const brief: TravelBrief = {
      ...raw,
      tripId: trip.id,
      destination: trip.destination,
      generatedAt: new Date().toISOString(),
    }

    return NextResponse.json({ brief })
  } catch (err) {
    console.error('Brief error:', err)
    const message = err instanceof Error ? err.message : 'Failed to generate travel brief'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
