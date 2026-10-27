import type { GeneratedItinerary } from './types'

const STOP_WORDS = new Set(
  'with from your this that before after them have will into more than when where which while also just only about over then there their they what time open opens hours book'.split(' '),
)

const words = (t: string) =>
  new Set(t.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 3 && !STOP_WORDS.has(w)))

/** Same advice in other words: at least 3 shared distinctive words, covering 55%+ of the shorter text */
export function sameAdvice(a: string, b: string): boolean {
  const A = words(a)
  const B = words(b)
  const shared = [...A].filter((w) => B.has(w)).length
  return shared >= 3 && shared / Math.min(A.size, B.size) >= 0.55
}

/**
 * Each day's tips with repeats removed: a tip that restates one of that day's stop notes,
 * a trip-wide tip or a tip already shown on an earlier day is dropped.
 */
export function uniqueDayTips(itinerary: GeneratedItinerary): string[][] {
  const seen = [...(itinerary.generalTips ?? [])]
  return itinerary.days.map((d) => {
    const notes = [...(d.morning ?? []), ...(d.afternoon ?? []), ...(d.evening ?? [])]
      .map((b) => b.notes)
      .filter((n): n is string => !!n)
    return (d.travelTips ?? []).filter((tip) => {
      if ([...notes, ...seen].some((x) => sameAdvice(tip, x))) return false
      seen.push(tip)
      return true
    })
  })
}

/** Model text sometimes carries markdown bold; the binder shows plain text */
export const plain = (t: string) => t.replace(/\*\*/g, '')
