import type { TravelCard } from './types'

type Placeish = Pick<TravelCard, 'title' | 'location'>

// Words that name the kind of place, not the place: "Byodo-in Temple" and "Byodo-in" are one pin
const GENERIC = /\b(the|a|an|of|and|temple|shrine|park|garden|gardens|museum|market|cafe|coffee|restaurant|station|area|district|city|town|street|old|famous|honten|main|branch|store|shop|flagship)\b/g

/** Lower-case, accent-free, punctuation-free, without generic words: "Sensō-ji Temple" → "sensoji" */
function norm(s: string | undefined): string {
  return (s ?? '')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(GENERIC, ' ')
    .replace(/\s+/g, '')
}

/** The names a pin goes by. The title is a caption ("Matcha at sunrise"), so it only counts when there's no place name */
function names(p: Placeish): string[] {
  const keys = [p.location?.nameEnglish, p.location?.nameLocal].map(norm)
  if (!p.location?.nameEnglish) keys.push(norm(p.title))
  return keys.filter((k) => k.length >= 2)
}

export function samePlace(a: Placeish, b: Placeish): boolean {
  const bn = names(b)
  return names(a).some((k) => bn.includes(k))
}

/** Split freshly found places into new ones and ones the board (or this same batch) already has */
export function splitRepeats<T extends Placeish>(found: T[], board: Placeish[]): { fresh: T[]; repeats: T[] } {
  const fresh: T[] = []
  const repeats: T[] = []
  for (const p of found) {
    if (board.some((c) => samePlace(p, c)) || fresh.some((c) => samePlace(p, c))) repeats.push(p)
    else fresh.push(p)
  }
  return { fresh, repeats }
}

/** Names of what's pinned, for telling the place finder not to return them again */
export function pinnedNames(board: Placeish[]): string[] {
  return board.map((c) => c.location?.nameEnglish || c.title).filter(Boolean).slice(0, 80)
}
