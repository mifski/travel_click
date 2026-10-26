import Anthropic from '@anthropic-ai/sdk'
import type { TravelCard } from './types'
import { clamp } from './api-guard'
import { fetchPlaceImage } from './place-image'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export type PlaceCandidate = Omit<TravelCard, 'id' | 'tripId' | 'pinPosition' | 'savedAt'>

/** Resolve free text ("USJ", a page title) into up to 4 real places near the trip, with photos */
export async function searchPlaces(
  query: string,
  trip: { destination?: string; country?: string },
  sourceUrl?: string,
): Promise<PlaceCandidate[]> {
  const near = [trip.destination, trip.country].filter(Boolean).map((s) => clamp(s, 80)).join(', ')
  const prompt = `A traveller${near ? ` planning a trip to ${near}` : ''} wants to pin this place: "${clamp(query, 600)}".

Identify the real place(s) they most likely mean. Expand nicknames and abbreviations (e.g. "USJ" = Universal Studios Japan, "MBS" = Marina Bay Sands). Prefer places in or near the trip destination, but if the query clearly names somewhere else, use that. Return 1 result when the match is obvious, up to 4 when it is ambiguous. Never invent places.

Return ONLY valid JSON:
{"places":[{"nameEnglish":"Universal Studios Japan","nameLocal":"ユニバーサル・スタジオ・ジャパン","city":"Osaka","country":"Japan","description":"One sentence on what it is and why people go","tip":"One short practical tip","tags":["theme park","attraction"]}]}

tags: 1-3 lowercase words from: cafe, restaurant, street food, shopping, nature, park, museum, temple, shrine, landmark, viewpoint, nightlife, bar, wellness, onsen, beach, hotel, market, theme park, attraction.`

  const response = await client.messages.create({
    // ponytail: Haiku keeps search snappy; switch to Sonnet if it mislabels well-known places
    model: 'claude-haiku-4-5',
    max_tokens: 1200,
    messages: [{ role: 'user', content: prompt }],
  })
  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return []
  const raw = JSON.parse(match[0]) as { places?: Record<string, unknown>[] }

  const places = (raw.places ?? []).filter((p) => p.nameEnglish).slice(0, 4)
  return Promise.all(places.map(async (p): Promise<PlaceCandidate> => {
    const nameEnglish = clamp(p.nameEnglish, 120)
    const city = clamp(p.city, 80)
    const country = clamp(p.country, 80)
    const image = await fetchPlaceImage(nameEnglish, city, country)
    // Same-origin proxy so the browser never hits Wikimedia CORS/ORB walls
    const imageUrl = image ? `/api/img?url=${encodeURIComponent(image)}` : undefined
    const description = [clamp(p.description, 240), p.tip ? clamp(p.tip, 160) : ''].filter(Boolean).join(' ')
    return {
      source: sourceUrl ? 'article' : 'manual',
      title: nameEnglish,
      description,
      location: { nameEnglish, nameLocal: p.nameLocal ? clamp(p.nameLocal, 120) : undefined, city, country },
      tags: Array.isArray(p.tags) ? p.tags.slice(0, 3).map((t) => clamp(t, 30)) : [],
      confidence: 'high',
      imageUrl,
      thumbnailUrl: imageUrl,
      sourceUrl,
    }
  }))
}
