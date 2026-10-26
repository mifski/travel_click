import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { DestinationScore, TempPreference } from '@/lib/types'
import { rateLimit, clamp, clampInt } from '@/lib/api-guard'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface CompareBody {
  candidates: string[]
  months: string[]
  tempPref: TempPreference
  priorities: string[]
  travelerNote?: string
  paxCount: number
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 'compare', 8)
  if (limited) return limited

  const body: CompareBody = await req.json()
  const tempPref: TempPreference = ['cold', 'mild', 'warm', 'any'].includes(body.tempPref) ? body.tempPref : 'any'

  if (!body.candidates?.length || body.candidates.length < 2 || body.candidates.length > 4) {
    return NextResponse.json({ error: 'Provide 2–4 candidate destinations' }, { status: 400 })
  }
  if (!body.months?.length || body.months.length > 3) {
    return NextResponse.json({ error: 'Provide 1–3 candidate months' }, { status: 400 })
  }

  const candidates = body.candidates.map((c) => clamp(c, 60))
  const months = body.months.map((m) => clamp(m, 20))
  const priorities = (Array.isArray(body.priorities) ? body.priorities : []).slice(0, 8).map((p) => clamp(p, 30))
  const travelerNote = body.travelerNote ? clamp(body.travelerNote, 600) : undefined
  const paxCount = clampInt(body.paxCount, 1, 20)

  const now = new Date()
  const tempDesc: Record<TempPreference, string> = {
    cold: 'cool-to-cold weather (roughly 0–15°C highs) — they actively WANT it chilly',
    mild: 'mild, comfortable weather (roughly 15–22°C highs)',
    warm: 'warm weather (22°C+ highs)',
    any: 'no strong temperature preference',
  }

  const prompt = `You are a sharp, honest travel analyst. A traveller is choosing between destinations and needs ONE clear recommendation.

CANDIDATES: ${candidates.join(' · ')}
TRAVEL WINDOW: ${months.join(', ')} (the next upcoming occurrence of these months — today is ${now.toISOString().split('T')[0]})
GROUP: ${paxCount} traveller${paxCount > 1 ? 's' : ''}${travelerNote ? `. Traveller's own words: "${travelerNote}"` : ''}
TEMPERATURE PREFERENCE: ${tempDesc[tempPref]}
TOP PRIORITIES (weight these heavily in fit scores): ${priorities.length ? priorities.join(', ') : 'overall value'}

All prices are in Singapore dollars, written as S$ (e.g. "S$45"). Put S$ amounts in dailyCostUSD and hotelNightUSD despite the field names.

Return ONLY valid JSON (no markdown) in this exact structure:
{
  "results": [
    {
      "destination": "City name",
      "country": "Country",
      "iata": "main airport code",
      "months": [
        { "month": "November", "tempLowC": 8, "tempHighC": 15, "rain": "low|medium|high", "crowds": "low|medium|high", "note": "short seasonal note if important" }
      ],
      "dailyCostUSD": "S$XX–XX per person",
      "hotelNightUSD": "S$XX–XX",
      "flightNote": "1 sentence: typical fare context for this route/season and whether a quoted fare is reasonable",
      "visaNote": "1 sentence: entry/visa reality for most Western/SEA passports — be specific and honest",
      "vibe": "1 vivid sentence capturing the city's character",
      "highlights": ["3 short concrete highlights"],
      "watchouts": ["1-2 short honest watch-outs (holiday crowds, weather traps, price surges)"],
      "fitScore": 0,
      "fitReason": "1-2 sentences explaining the score against THEIR stated priorities"
    }
  ],
  "verdict": {
    "winner": "City name",
    "bestMonth": "Month name",
    "reasoning": "2-3 plain-English sentences a traveller could forward to a sceptical parent — name the temperature, the cost reality, and the deciding factor",
    "runnerUp": "City name"
  }
}

Rules:
- "months" must cover exactly the requested months (${months.join(', ')}) in order, for every candidate, with realistic climate normals.
- Flag national holidays and seasonal events that change crowds/prices (e.g. China National Day Golden Week Oct 1–7, Japan autumn-foliage peak, Christmas/NYE surges).
- fitScore is 0–100, weighted by THEIR priorities (temperature preference + stated priorities), not generic popularity. Scores must differ between candidates.
- Daily cost = food + transit + attractions per person, matched to a mid-range style unless their note suggests otherwise.
- Be honest. If a candidate fails their temperature preference in the chosen months, say so plainly and score it down.`

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    let raw: { results: DestinationScore[]; verdict: { winner: string; bestMonth: string; reasoning: string; runnerUp?: string } }
    try {
      raw = JSON.parse(text)
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('AI did not return valid JSON. Try again.')
      raw = JSON.parse(jsonMatch[0])
    }

    if (!Array.isArray(raw.results) || raw.results.length < 2 || !raw.verdict?.winner) {
      throw new Error('Comparison came back incomplete. Try again.')
    }

    return NextResponse.json({ results: raw.results, verdict: raw.verdict })
  } catch (err) {
    console.error('Compare error:', err)
    const message = err instanceof Error ? err.message : 'Failed to compare destinations'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
