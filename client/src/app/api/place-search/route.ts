import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, clamp } from '@/lib/api-guard'
import { searchPlaces } from '@/lib/place-search'

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 'place-search', 40)
  if (limited) return limited

  const body = await req.json()
  const query = clamp(body.query, 160).trim()
  if (query.length < 2) return NextResponse.json({ error: 'Type a place name' }, { status: 400 })

  try {
    const places = await searchPlaces(query, { destination: body.destination, country: body.country })
    return NextResponse.json({ places })
  } catch (err) {
    console.error('Place search error:', err)
    return NextResponse.json({ error: 'Search failed. Try again.' }, { status: 500 })
  }
}
