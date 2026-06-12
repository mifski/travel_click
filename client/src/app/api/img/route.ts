import { NextRequest, NextResponse } from 'next/server'

// Same-origin image proxy for card artwork. Strict allowlist — only Wikimedia image hosts.
const ALLOWED_HOSTS = new Set(['upload.wikimedia.org', 'en.wikipedia.org'])

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('url')
  if (!raw) return new NextResponse('url required', { status: 400 })

  let target: URL
  try {
    target = new URL(raw)
  } catch {
    return new NextResponse('invalid url', { status: 400 })
  }
  if (target.protocol !== 'https:' || !ALLOWED_HOSTS.has(target.hostname)) {
    return new NextResponse('host not allowed', { status: 403 })
  }

  try {
    const upstream = await fetch(target, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TravelClick/1.0; travel planner image proxy)' },
      signal: AbortSignal.timeout(8000),
    })
    if (!upstream.ok || !upstream.body) {
      return new NextResponse('upstream error', { status: 502 })
    }
    const contentType = upstream.headers.get('content-type') ?? 'image/jpeg'
    if (!contentType.startsWith('image/')) {
      return new NextResponse('not an image', { status: 502 })
    }
    return new NextResponse(upstream.body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    })
  } catch {
    return new NextResponse('fetch failed', { status: 502 })
  }
}
