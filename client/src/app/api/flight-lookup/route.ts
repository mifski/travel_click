import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, clamp } from '@/lib/api-guard'

// AeroDataBox (via RapidAPI) — free Basic plan covers personal use. Key goes in .env.local as AERODATABOX_KEY.
const KEY = process.env.AERODATABOX_KEY
const HOST = 'aerodatabox.p.rapidapi.com'

type Leg = {
  airport?: { iata?: string; municipalityName?: string }
  scheduledTime?: { local?: string }
  scheduledTimeLocal?: string // older response shape
}

/** "2026-11-15 23:55+08:00" → "2026-11-15T23:55" (local wall-clock time, what the form stores) */
const toLocal = (s?: string) => (s ? s.slice(0, 16).replace(' ', 'T') : '')

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 'flight-lookup', 30)
  if (limited) return limited

  if (!KEY) {
    return NextResponse.json(
      { error: 'Flight lookup isn’t set up yet: add AERODATABOX_KEY to client/.env.local. You can still fill the flight in by hand.' },
      { status: 503 },
    )
  }

  const body = await req.json()
  const flightNo = clamp(body.flightNo, 10).toUpperCase().replace(/\s+/g, '')
  const date = clamp(body.date, 10)
  if (!/^[A-Z0-9]{2}\d{1,4}[A-Z]?$/.test(flightNo)) {
    return NextResponse.json({ error: 'Enter a flight number like SQ638' }, { status: 400 })
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Pick the departure date' }, { status: 400 })
  }

  try {
    const res = await fetch(
      `https://${HOST}/flights/number/${flightNo}/${date}?withAircraftImage=false&withLocation=false&dateLocalRole=Departure`,
      { headers: { 'X-RapidAPI-Key': KEY, 'X-RapidAPI-Host': HOST }, signal: AbortSignal.timeout(10000) },
    )
    if (res.status === 204 || res.status === 404) {
      return NextResponse.json({ error: `No ${flightNo} found on ${date}. Schedules may not be published that far ahead yet.` }, { status: 404 })
    }
    if (!res.ok) throw new Error(`Flight data service returned ${res.status}`)

    const flights = (await res.json()) as { departure?: Leg; arrival?: Leg; airline?: { name?: string } }[]
    const f = flights[0]
    if (!f?.departure || !f.arrival) {
      return NextResponse.json({ error: `No ${flightNo} found on ${date}.` }, { status: 404 })
    }
    return NextResponse.json({
      flightNo,
      airline: f.airline?.name ?? '',
      from: f.departure.airport?.iata ?? '',
      to: f.arrival.airport?.iata ?? '',
      departAt: toLocal(f.departure.scheduledTime?.local ?? f.departure.scheduledTimeLocal),
      arriveAt: toLocal(f.arrival.scheduledTime?.local ?? f.arrival.scheduledTimeLocal),
    })
  } catch (err) {
    console.error('Flight lookup error:', err)
    return NextResponse.json({ error: 'Couldn’t reach the flight data service. Fill it in by hand for now.' }, { status: 502 })
  }
}
