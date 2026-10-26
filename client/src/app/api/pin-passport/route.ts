import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { PinPassport } from '@/lib/types'
import { rateLimit, clamp } from '@/lib/api-guard'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const KINDS: PinPassport['kind'][] = ['classic', 'in-between', 'gem']

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 'pin-passport', 30)
  if (limited) return limited

  const body = await req.json()
  const cardId = clamp(body.cardId, 64)
  const place = clamp(body.place, 160)
  const where = clamp(body.where, 120)
  const note = clamp(body.note, 300)
  if (!cardId || !place) {
    return NextResponse.json({ error: 'Place required' }, { status: 400 })
  }

  const prompt = `You fill in a traveller's "pin passport": the practical facts for one saved place.

PLACE: ${place}${where ? `\nIN: ${where}` : ''}${note ? `\nTHEIR NOTE: ${note}` : ''}

Rules:
- Each field ≤ 14 words, plain and specific (e.g. "9:00–17:00, closed Mondays")
- kind: "classic" = on every first-timer's list; "gem" = locals' pick most visitors miss; otherwise "in-between"
- booking: how to get in (walk-in, timed ticket, reservation weeks ahead…)
- price: per person in Singapore dollars (S$), or "Free"
- If you don't know a fact, say "Check before you go" rather than guessing
- sourceUrl: only the exact official site if you know it; never invent URLs

Return ONLY valid JSON:
{"kind":"classic","hours":"","bestTime":"","timeNeeded":"","price":"","booking":"","tip":"","sourceUrl":"https://..."}`

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = response.content[0]?.type === 'text' ? response.content[0].text : ''
    const json = text.match(/\{[\s\S]*\}/)?.[0]
    if (!json) throw new Error('Passport came back empty. Try again.')
    const raw = JSON.parse(json) as Partial<Record<keyof PinPassport, unknown>>

    const field = (v: unknown) => clamp(v, 120) || 'Check before you go'
    const url = typeof raw.sourceUrl === 'string' && /^https:\/\//.test(raw.sourceUrl) ? clamp(raw.sourceUrl, 300) : undefined
    const passport: PinPassport = {
      cardId,
      stampedAt: new Date().toISOString(),
      kind: KINDS.find((k) => k === raw.kind) ?? 'in-between',
      hours: field(raw.hours),
      bestTime: field(raw.bestTime),
      timeNeeded: field(raw.timeNeeded),
      price: field(raw.price),
      booking: field(raw.booking),
      tip: field(raw.tip),
      sourceUrl: url,
    }
    return NextResponse.json({ passport })
  } catch (err) {
    console.error('Pin passport error:', err)
    const message = err instanceof Error ? err.message : 'Failed to stamp passport'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
