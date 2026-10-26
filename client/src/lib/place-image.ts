/** Server-side helper: ask our own /api/place-image route for a photo of a place (null when none fits) */
export async function fetchPlaceImage(name: string, city: string, country: string): Promise<string | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const params = new URLSearchParams({ name, city, country })
    const res = await fetch(`${baseUrl}/api/place-image?${params}`, { signal: AbortSignal.timeout(6000) })
    if (!res.ok) return null
    const data = await res.json()
    return data.url ?? null
  } catch { return null }
}
