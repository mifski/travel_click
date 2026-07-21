export interface CategoryInfo {
  key: string
  label: string
  icon: string
  color: string        // hex accent
  heroBg: string       // CSS gradient for card hero when no image
  badgeBg: string      // Tailwind bg class
  badgeText: string    // Tailwind text class
  boardAccent: string  // top strip color on board card
}

// All known categories with visuals
export const CATEGORIES: Record<string, CategoryInfo> = {
  cafe: {
    key: 'cafe', label: 'Café', icon: '☕',
    color: '#c8860a',
    heroBg: 'linear-gradient(135deg,#78350f 0%,#b45309 60%,#d97706 100%)',
    badgeBg: 'bg-amber-900/80', badgeText: 'text-amber-200',
    boardAccent: '#b45309',
  },
  restaurant: {
    key: 'restaurant', label: 'Restaurant', icon: '🍽️',
    color: '#ea580c',
    heroBg: 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#f97316 100%)',
    badgeBg: 'bg-orange-900/80', badgeText: 'text-orange-200',
    boardAccent: '#c2410c',
  },
  streetfood: {
    key: 'streetfood', label: 'Street Food', icon: '🥢',
    color: '#d97706',
    heroBg: 'linear-gradient(135deg,#713f12 0%,#a16207 60%,#eab308 100%)',
    badgeBg: 'bg-yellow-900/80', badgeText: 'text-yellow-200',
    boardAccent: '#a16207',
  },
  shopping: {
    key: 'shopping', label: 'Shopping', icon: '🛍️',
    color: '#9333ea',
    heroBg: 'linear-gradient(135deg,#4a044e 0%,#7e22ce 60%,#a855f7 100%)',
    badgeBg: 'bg-purple-900/80', badgeText: 'text-purple-200',
    boardAccent: '#7e22ce',
  },
  nature: {
    key: 'nature', label: 'Nature', icon: '🌿',
    color: '#16a34a',
    heroBg: 'linear-gradient(135deg,#052e16 0%,#15803d 60%,#4ade80 100%)',
    badgeBg: 'bg-green-900/80', badgeText: 'text-green-200',
    boardAccent: '#15803d',
  },
  culture: {
    key: 'culture', label: 'Culture', icon: '🏛️',
    color: '#2563eb',
    heroBg: 'linear-gradient(135deg,#1e1b4b 0%,#1d4ed8 60%,#60a5fa 100%)',
    badgeBg: 'bg-blue-900/80', badgeText: 'text-blue-200',
    boardAccent: '#1d4ed8',
  },
  nightlife: {
    key: 'nightlife', label: 'Nightlife', icon: '🎉',
    color: '#db2777',
    heroBg: 'linear-gradient(135deg,#4a044e 0%,#be185d 60%,#f472b6 100%)',
    badgeBg: 'bg-pink-900/80', badgeText: 'text-pink-200',
    boardAccent: '#be185d',
  },
  wellness: {
    key: 'wellness', label: 'Wellness', icon: '🧘',
    color: '#0d9488',
    heroBg: 'linear-gradient(135deg,#042f2e 0%,#0f766e 60%,#2dd4bf 100%)',
    badgeBg: 'bg-teal-900/80', badgeText: 'text-teal-200',
    boardAccent: '#0f766e',
  },
  beach: {
    key: 'beach', label: 'Beach', icon: '🏖️',
    color: '#0ea5e9',
    heroBg: 'linear-gradient(135deg,#082f49 0%,#0369a1 60%,#38bdf8 100%)',
    badgeBg: 'bg-sky-900/80', badgeText: 'text-sky-200',
    boardAccent: '#0369a1',
  },
  accommodation: {
    key: 'accommodation', label: 'Stay', icon: '🏨',
    color: '#475569',
    heroBg: 'linear-gradient(135deg,#0f172a 0%,#334155 60%,#94a3b8 100%)',
    badgeBg: 'bg-slate-800/80', badgeText: 'text-slate-200',
    boardAccent: '#334155',
  },
  market: {
    key: 'market', label: 'Market', icon: '🏮',
    color: '#dc2626',
    heroBg: 'linear-gradient(135deg,#450a0a 0%,#b91c1c 60%,#f87171 100%)',
    badgeBg: 'bg-red-900/80', badgeText: 'text-red-200',
    boardAccent: '#b91c1c',
  },
  spiritual: {
    key: 'spiritual', label: 'Spiritual', icon: '⛩️',
    color: '#b45309',
    heroBg: 'linear-gradient(135deg,#451a03 0%,#92400e 60%,#f59e0b 100%)',
    badgeBg: 'bg-amber-900/80', badgeText: 'text-amber-100',
    boardAccent: '#92400e',
  },
  other: {
    key: 'other', label: 'Place', icon: '📍',
    color: '#6b7280',
    heroBg: 'linear-gradient(135deg,#111827 0%,#374151 60%,#9ca3af 100%)',
    badgeBg: 'bg-gray-800/80', badgeText: 'text-gray-200',
    boardAccent: '#374151',
  },
}

// Tag → category key mapping
const TAG_MAP: Record<string, string> = {
  // food/drink
  café: 'cafe', cafe: 'cafe', coffee: 'cafe', 'coffee shop': 'cafe', espresso: 'cafe', bakery: 'cafe',
  restaurant: 'restaurant', dining: 'restaurant', noodle: 'restaurant', sushi: 'restaurant',
  ramen: 'restaurant', 'dim sum': 'restaurant', dumpling: 'restaurant', bbq: 'restaurant',
  seafood: 'restaurant', steakhouse: 'restaurant', 'fine dining': 'restaurant', brunch: 'restaurant',
  breakfast: 'restaurant', lunch: 'restaurant', dinner: 'restaurant',
  'street food': 'streetfood', hawker: 'streetfood', stall: 'streetfood', snack: 'streetfood',
  bar: 'nightlife', nightlife: 'nightlife', club: 'nightlife', cocktail: 'nightlife', pub: 'nightlife',
  // shopping
  shopping: 'shopping', mall: 'shopping', boutique: 'shopping', fashion: 'shopping',
  retail: 'shopping', market: 'market', clothing: 'shopping', vintage: 'shopping',
  // nature
  nature: 'nature', park: 'nature', garden: 'nature', forest: 'nature', hiking: 'nature',
  waterfall: 'nature', mountain: 'nature', lake: 'nature', wildlife: 'nature',
  beach: 'beach', coast: 'beach', ocean: 'beach', island: 'beach',
  // culture
  museum: 'culture', gallery: 'culture', art: 'culture', history: 'culture', culture: 'culture',
  heritage: 'culture', monument: 'culture', architecture: 'culture', landmark: 'culture',
  temple: 'spiritual', shrine: 'spiritual', mosque: 'spiritual', church: 'spiritual', spiritual: 'spiritual',
  // wellness/stay
  spa: 'wellness', wellness: 'wellness', yoga: 'wellness', onsen: 'wellness',
  hotel: 'accommodation', hostel: 'accommodation', resort: 'accommodation', accommodation: 'accommodation',
}

/* ── Luggage-tag filter chips — categories fold into five broad groups ── */
export interface ChipGroup {
  key: string
  label: string
  color: string
  /** idle chip resting tilt, degrees */
  rotation: number
}

export const CHIP_GROUPS: ChipGroup[] = [
  { key: 'culture',   label: 'CULTURE',   color: '#c94040', rotation: -1 },
  { key: 'food',      label: 'FOOD',      color: '#a86030', rotation: 1 },
  { key: 'nature',    label: 'NATURE',    color: '#6b8f5e', rotation: -1 },
  { key: 'nightlife', label: 'NIGHTLIFE', color: '#c9a84c', rotation: 1.5 },
  { key: 'landmarks', label: 'LANDMARKS', color: '#7e9ab5', rotation: -1 },
]

const CATEGORY_TO_GROUP: Record<string, string> = {
  culture: 'culture', spiritual: 'culture',
  cafe: 'food', restaurant: 'food', streetfood: 'food', market: 'food',
  nature: 'nature', beach: 'nature',
  nightlife: 'nightlife',
  shopping: 'landmarks', wellness: 'landmarks', accommodation: 'landmarks', other: 'landmarks',
}

export function getChipGroup(categoryKey: string): string {
  return CATEGORY_TO_GROUP[categoryKey] ?? 'landmarks'
}

export function getCategoryFromTags(tags: string[]): CategoryInfo {
  const lower = tags.map(t => t.toLowerCase().trim())
  for (const tag of lower) {
    const key = TAG_MAP[tag]
    if (key && CATEGORIES[key]) return CATEGORIES[key]
    // partial match
    for (const [mapTag, catKey] of Object.entries(TAG_MAP)) {
      if (tag.includes(mapTag) || mapTag.includes(tag)) {
        const cat = CATEGORIES[catKey]
        if (cat) return cat
      }
    }
  }
  return CATEGORIES.other
}
