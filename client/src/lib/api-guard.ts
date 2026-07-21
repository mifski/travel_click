import { NextRequest, NextResponse } from 'next/server'

/**
 * Per-IP sliding-window rate limiter for the AI routes. In-memory, so it
 * protects within one warm server process — enough to stop bot loops and
 * accidental runaway clients at friends-and-family scale without adding
 * infrastructure. Swap for Upstash/Redis if traffic ever outgrows it.
 */
type Window = { count: number; resetAt: number }
const windows = new Map<string, Window>()

function clientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}

/** Returns a 429 response when the caller exceeded `limit` calls per `windowMs`, else null. */
export function rateLimit(
  req: NextRequest,
  route: string,
  limit: number,
  windowMs = 60 * 60 * 1000
): NextResponse | null {
  const key = `${route}:${clientIp(req)}`
  const now = Date.now()
  const w = windows.get(key)

  if (!w || now > w.resetAt) {
    if (windows.size > 5000) {
      for (const [k, v] of windows) if (now > v.resetAt) windows.delete(k)
    }
    windows.set(key, { count: 1, resetAt: now + windowMs })
    return null
  }

  w.count++
  if (w.count > limit) {
    const mins = Math.max(1, Math.ceil((w.resetAt - now) / 60000))
    return NextResponse.json(
      { error: `You've hit the generation limit for now — try again in ~${mins} min.` },
      { status: 429, headers: { 'Retry-After': String(mins * 60) } }
    )
  }
  return null
}

/** Clamp a free-text field so oversized payloads can't stuff the prompt. */
export function clamp(value: unknown, max: number): string {
  return String(value ?? '').slice(0, max)
}

/** Clamp a number into a sane range (NaN → min). */
export function clampInt(value: unknown, min: number, max: number): number {
  const n = Math.round(Number(value))
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, n))
}
