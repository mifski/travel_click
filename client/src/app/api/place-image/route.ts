import { NextRequest, NextResponse } from 'next/server'

const BAD_PATTERNS = /\.(svg|pdf)(\?|$)|Flag_of|Nuvola|Pictogram|Commons-logo|Wikidata|Wikipedia-logo|OOjs|coat_of_arms|emblem|Map_of|Location_map|Red_pog/i

function isGoodImage(url: string, minWidth = 180): boolean {
  if (BAD_PATTERNS.test(url)) return false
  if (url.toLowerCase().includes('.svg')) return false
  if (!/\.(jpe?g|png|webp)/i.test(url)) return false
  const wMatch = url.match(/\/(\d+)px-/)
  if (wMatch && parseInt(wMatch[1]) < minWidth) return false
  return true
}

/** Strip diacritics: "Sensō-ji" → "senso-ji", "Ōsaka" → "osaka" */
function normStr(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/** Check if an article title is meaningfully related to the query.
 *  Handles diacritics (ō, é, ñ…) and hyphenated names.
 */
function isTitleRelevant(query: string, articleTitle: string): boolean {
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'in', 'at', 'on', 'to', 'is'])
  const qNorm = normStr(query)
  const tNorm = normStr(articleTitle)
  // Split on whitespace, commas, AND hyphens so "Senso-ji" → ["senso","ji"]
  const qWords = qNorm.split(/[\s,\-]+/).filter(w => w.length > 2 && !stopWords.has(w))
  // At least one significant query word must appear anywhere in the normalised title
  if (qWords.some(word => tNorm.includes(word))) return true
  // Reverse check: at least one significant title word must appear in the normalised query
  const tWords = tNorm.split(/[\s,\-]+/).filter(w => w.length > 3 && !stopWords.has(w))
  return tWords.some(word => qNorm.includes(word))
}

/** Wikipedia REST summary API */
async function wikiSummaryImage(title: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      { signal: AbortSignal.timeout(4000) }
    )
    if (!res.ok) return null
    const data = await res.json()
    const src: string | undefined = data?.originalimage?.source ?? data?.thumbnail?.source
    if (src && isGoodImage(src)) return src
    return null
  } catch { return null }
}

/** Wikipedia search → return image only if the result title is relevant to the query */
async function wikiSearchImage(query: string): Promise<string | null> {
  try {
    const searchRes = await fetch(
      `https://en.wikipedia.org/w/api.php?${new URLSearchParams({
        action: 'query', list: 'search', srsearch: query,
        srlimit: '5', format: 'json', origin: '*',
      })}`,
      { signal: AbortSignal.timeout(4000) }
    )
    if (!searchRes.ok) return null
    const hits = ((await searchRes.json())?.query?.search ?? []) as Array<{ title: string }>

    for (const hit of hits) {
      // Skip if the article title has no overlap with the query — avoids wildly wrong images
      if (!isTitleRelevant(query, hit.title)) continue
      const url = await wikiSummaryImage(hit.title)
      if (url) return url
    }
    return null
  } catch { return null }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const name    = (searchParams.get('name') ?? '').trim()
  const city    = (searchParams.get('city') ?? '').trim()

  if (!name) return NextResponse.json({ url: null })

  // 1. Try direct Wikipedia summary by exact name (most accurate)
  const directUrl = await wikiSummaryImage(name)
  if (directUrl) return NextResponse.json({ url: directUrl })

  // 2. Try normalised name alone (strips diacritics from user-entered title)
  const normName = normStr(name).replace(/\b\w/g, c => c.toUpperCase())
  if (normName !== name) {
    const normUrl = await wikiSummaryImage(normName)
    if (normUrl) return NextResponse.json({ url: normUrl })
  }

  // 3. Try with city appended (e.g. "Senso-ji, Tokyo")
  if (city) {
    const withCity = await wikiSummaryImage(`${name}, ${city}`)
    if (withCity) return NextResponse.json({ url: withCity })
  }

  // 4. Fall back to search — but only accept relevance-matched results
  const searchQuery = city ? `${name} ${city}` : name
  const searchUrl = await wikiSearchImage(searchQuery)
  if (searchUrl) return NextResponse.json({ url: searchUrl })

  // 5. No good image found — let the card show its category gradient
  return NextResponse.json({ url: null })
}
