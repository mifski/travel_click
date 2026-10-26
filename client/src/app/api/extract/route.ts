import { NextRequest, NextResponse } from 'next/server'
import { getSourceFromUrl, isYouTubeUrl } from '@/lib/utils'
import { rateLimit, clamp } from '@/lib/api-guard'
import { fetchPlaceImage } from '@/lib/place-image'
import { searchPlaces } from '@/lib/place-search'

/** Hosts the C# video backend can read; any other link is treated as an article page */
const SOCIAL_HOST = /(^|\.)(tiktok\.com|instagram\.com|youtube\.com|youtu\.be|x\.com|twitter\.com|facebook\.com|fb\.watch|xiaohongshu\.com|xhslink\.com)$/i

/** Pull title + description from an article page so place search can resolve it */
async function readArticle(url: string): Promise<string | null> {
  // ponytail: blocks private hosts by name/IP literal only; DNS-rebinding needs a resolve-then-check if this goes public
  const host = new URL(url).hostname
  if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.|\[|::1)|\.(local|internal)$/i.test(host)) return null
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 TravelClick/1.0' }, signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const html = (await res.text()).slice(0, 200_000)
    const meta = (p: string) => html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${p}["'][^>]+content=["']([^"']+)`, 'i'))?.[1]
    const title = meta('og:title') ?? html.match(/<title[^>]*>([^<]+)/i)?.[1]
    const desc = meta('og:description') ?? meta('description')
    return [title, desc].filter(Boolean).join('. ') || null
  } catch { return null }
}

/** Post caption via public oEmbed (TikTok, X) or the page's preview tags (Instagram and the rest) */
async function readSocialCaption(url: string): Promise<string | null> {
  const host = new URL(url).hostname
  const oembed = /(^|\.)tiktok\.com$/i.test(host) ? `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`
    : /(^|\.)(x|twitter)\.com$/i.test(host) ? `https://publish.twitter.com/oembed?omit_script=1&url=${encodeURIComponent(url)}`
    : null
  if (oembed) {
    try {
      const res = await fetch(oembed, { signal: AbortSignal.timeout(8000) })
      if (res.ok) {
        const data = await res.json() as { title?: string; html?: string; author_name?: string }
        const text = data.title || data.html?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
        if (text) return [text, data.author_name && `by ${data.author_name}`].filter(Boolean).join(' ')
      }
    } catch { /* fall through to the page tags */ }
  }
  return readArticle(url)
}

/** No video backend: find places in the post's caption instead of its frames */
async function extractFromCaption(url: string, manualCaption: string | undefined, body: Record<string, unknown>) {
  const source = getSourceFromUrl(url)
  const text = manualCaption ?? await readSocialCaption(url)
  if (!text) {
    return NextResponse.json({ error: 'Couldn’t read this post’s caption. Paste it in “add a caption” and try again.' }, { status: 422 })
  }
  try {
    const cards = await searchPlaces(text, { destination: clamp(body.destination, 80), country: clamp(body.country, 80), pinned: Array.isArray(body.pinned) ? body.pinned : [] }, url)
    if (!cards.length) return NextResponse.json({ error: 'No places in this post’s caption. Add a caption naming the spots.' }, { status: 422 })
    return NextResponse.json({ source, cards: cards.map((c) => ({ ...c, source })) })
  } catch {
    return NextResponse.json({ error: 'Couldn’t pull places from that post. Try Search a place.' }, { status: 500 })
  }
}

// Unset in production means no video backend is deployed: social links use their captions
const BACKEND_URL = process.env.BACKEND_URL ?? (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5107')
const BACKEND_API_KEY = process.env.BACKEND_API_KEY

async function fetchYouTubeMetadata(url: string) {
  const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  const videoId = match?.[1]
  if (!videoId) return null
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
    const res = await fetch(oembedUrl)
    if (!res.ok) return null
    const data = await res.json()
    return { title: data.title, channel: data.author_name, thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`, videoId }
  } catch { return null }
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 'extract', 12)
  if (limited) return limited

  const body = await req.json()
  const url = clamp(body.url, 500)
  const manualCaption = body.manualCaption ? clamp(body.manualCaption, 1000) : undefined

  if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 })
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error()
  } catch {
    return NextResponse.json({ error: 'That doesn’t look like a valid link' }, { status: 400 })
  }

  const source = getSourceFromUrl(url)

  if (isYouTubeUrl(url)) {
    const meta = await fetchYouTubeMetadata(url)
    return NextResponse.json({
      source: 'youtube',
      cards: [{
        source: 'youtube',
        title: meta?.title ?? 'YouTube Video',
        description: manualCaption ?? `Travel video by ${meta?.channel ?? 'unknown creator'}`,
        location: { nameEnglish: manualCaption ?? 'Location from video', city: '', country: '' },
        imageUrl: meta?.thumbnailUrl,
        thumbnailUrl: meta?.thumbnailUrl,
        creator: meta?.channel,
        tags: ['video', 'youtube'],
        confidence: 'medium' as const,
        sourceUrl: url,
        metadata: { videoId: meta?.videoId, channel: meta?.channel },
      }],
    })
  }

  // Articles (Wikipedia, blogs): resolve the page's subject with place search instead of the video backend
  if (!SOCIAL_HOST.test(new URL(url).hostname)) {
    const text = manualCaption ?? await readArticle(url)
    if (!text) return NextResponse.json({ error: 'Couldn’t read that page. Add a caption, or use Search a place.' }, { status: 422 })
    try {
      const cards = await searchPlaces(text, { destination: clamp(body.destination, 80), country: clamp(body.country, 80), pinned: Array.isArray(body.pinned) ? body.pinned : [] }, url)
      return NextResponse.json({ source, cards })
    } catch {
      return NextResponse.json({ error: 'Couldn’t pull places from that page. Try Search a place.' }, { status: 500 })
    }
  }

  if (!BACKEND_URL) return extractFromCaption(url, manualCaption, body)

  try {
    const backendRes = await fetch(`${BACKEND_URL}/api/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(BACKEND_API_KEY ? { 'X-Api-Key': BACKEND_API_KEY } : {}),
      },
      body: JSON.stringify({ url, manualCaption }),
      signal: AbortSignal.timeout(300000),
    })

    if (!backendRes.ok) {
      const err = await backendRes.text()
      return NextResponse.json({ error: err || 'Extraction failed' }, { status: backendRes.status })
    }

    const places = await backendRes.json()

    // Transform + fetch place images in parallel
    const rawCards = places.map((p: Record<string, unknown>) => ({
      source,
      title: String(p.locationNameEnglish ?? p.locationName ?? 'Unknown Place'),
      description: String(p.description ?? ''),
      location: {
        nameEnglish: String(p.locationNameEnglish ?? ''),
        nameLocal: p.locationNameLocal ? String(p.locationNameLocal) : undefined,
        city: String(p.city ?? ''),
        country: String(p.country ?? ''),
      },
      tags: Array.isArray(p.categoryTags) ? p.categoryTags.map((t: unknown) => String(t)) : [],
      confidence: (p.locationConfidence as 'high' | 'medium' | 'low') ?? 'medium',
      sourceUrl: url,
      metadata: { extractionId: p.extractionId },
    }))

    // Fetch images in parallel (non-blocking: if all fail, cards still show).
    // Wikimedia URLs are wrapped in our same-origin proxy so the browser never hits CORS/ORB walls.
    const cards = await Promise.all(
      rawCards.map(async (card: typeof rawCards[0]) => {
        const imageUrl = await fetchPlaceImage(
          card.location.nameEnglish,
          card.location.city,
          card.location.country
        )
        return { ...card, imageUrl: imageUrl ? `/api/img?url=${encodeURIComponent(imageUrl)}` : undefined }
      })
    )

    return NextResponse.json({ source, cards })
  } catch (err) {
    const unreachable = err instanceof Error && (err.message.includes('ECONNREFUSED') || err.message.includes('fetch'))
    if (unreachable) return extractFromCaption(url, manualCaption, body)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to reach extraction service' }, { status: 500 })
  }
}
