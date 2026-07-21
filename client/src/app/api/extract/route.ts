import { NextRequest, NextResponse } from 'next/server'
import { getSourceFromUrl, isYouTubeUrl } from '@/lib/utils'
import { rateLimit, clamp } from '@/lib/api-guard'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:5107'
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

async function fetchPlaceImage(name: string, city: string, country: string): Promise<string | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const params = new URLSearchParams({ name, city, country })
    const res = await fetch(`${baseUrl}/api/place-image?${params}`, { signal: AbortSignal.timeout(6000) })
    if (!res.ok) return null
    const data = await res.json()
    return data.url ?? null
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
    const isConnRefused = err instanceof Error && (err.message.includes('ECONNREFUSED') || err.message.includes('fetch'))
    const msg = isConnRefused
      ? 'The extraction backend is not running. Start the C# backend (dotnet run) on port 5107, or use a YouTube link instead.'
      : (err instanceof Error ? err.message : 'Failed to reach extraction service')
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
