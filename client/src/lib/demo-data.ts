import type { TripContext, TravelCard, GeneratedItinerary, StickyNote } from './types'

export const DEMO_TRIP_ID = 'demo'

function isoDaysFromNow(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export function buildDemoTrip(): TripContext {
  return {
    id: DEMO_TRIP_ID,
    destination: 'Tokyo',
    country: 'Japan',
    startDate: isoDaysFromNow(21),
    endDate: isoDaysFromNow(24),
    paxCount: 2,
    ageRanges: ['adults'],
    objectives: ['food', 'culture', 'nightlife'],
    priceRange: 'mid',
    createdAt: new Date().toISOString(),
  }
}

// Served through our same-origin /api/img proxy so cards load without CORS/hotlink issues
const wiki = (path: string) =>
  `/api/img?url=${encodeURIComponent(`https://upload.wikimedia.org/wikipedia/commons/thumb/${path}`)}`

type DemoCardSeed = Omit<TravelCard, 'id' | 'tripId' | 'savedAt'>

const DEMO_CARD_SEEDS: DemoCardSeed[] = [
  {
    source: 'tiktok',
    title: 'Sensō-ji at sunrise — before the crowds',
    description: 'Tokyo\'s oldest temple, glowing red at dawn. Walk Nakamise-dōri for street snacks before 9 AM and you\'ll have it almost to yourself.',
    location: { nameEnglish: 'Senso-ji Temple', nameLocal: '浅草寺', city: 'Asakusa, Tokyo', country: 'Japan' },
    imageUrl: wiki('4/43/Sensoji_2023.jpg/500px-Sensoji_2023.jpg'),
    tags: ['temple', 'culture', 'landmark'],
    confidence: 'high',
    sourceUrl: 'https://www.tiktok.com/',
    creator: 'tokyo.wanders',
    pinPosition: { x: 0, y: 0, rotation: -2 },
  },
  {
    source: 'youtube',
    title: 'Crossing the world\'s busiest intersection',
    description: 'Up to 3,000 people cross at once. Best viewed from the Shibuya Sky deck or the Starbucks window seat in Tsutaya.',
    location: { nameEnglish: 'Shibuya Crossing', nameLocal: '渋谷スクランブル交差点', city: 'Shibuya, Tokyo', country: 'Japan' },
    imageUrl: wiki('8/88/Shibuya_Crossing%2C_Aerial.jpg/500px-Shibuya_Crossing%2C_Aerial.jpg'),
    tags: ['landmark', 'culture'],
    confidence: 'high',
    sourceUrl: 'https://www.youtube.com/',
    creator: 'WanderTokyo',
    pinPosition: { x: 0, y: 0, rotation: 1 },
  },
  {
    source: 'instagram',
    title: 'Forest calm in the middle of the city',
    description: 'A 100,000-tree forest hides this serene Shinto shrine. Watch for traditional weddings on weekend mornings.',
    location: { nameEnglish: 'Meiji Shrine', nameLocal: '明治神宮', city: 'Shibuya, Tokyo', country: 'Japan' },
    imageUrl: wiki('8/8b/Meiji_Jingu_2023-3.jpg/500px-Meiji_Jingu_2023-3.jpg'),
    tags: ['shrine', 'nature', 'spiritual'],
    confidence: 'high',
    sourceUrl: 'https://www.instagram.com/',
    creator: 'japan.frames',
    pinPosition: { x: 0, y: 0, rotation: 2 },
  },
  {
    source: 'article',
    title: 'Tokyo Skytree — 634 m above it all',
    description: 'The tallest tower in the world. Go 30 minutes before sunset to catch the city flip from day to neon night.',
    location: { nameEnglish: 'Tokyo Skytree', nameLocal: '東京スカイツリー', city: 'Sumida, Tokyo', country: 'Japan' },
    imageUrl: wiki('8/84/Tokyo_Skytree_2014_%E2%85%A2.jpg/500px-Tokyo_Skytree_2014_%E2%85%A2.jpg'),
    tags: ['landmark', 'architecture'],
    confidence: 'high',
    sourceUrl: 'https://www.japan-guide.com/e/e3064.html',
    pinPosition: { x: 0, y: 0, rotation: 3 },
  },
  {
    source: 'tiktok',
    title: 'Golden Gai — 6 alleys, 200 tiny bars',
    description: 'Post-war alleyways crammed with shoebox bars seating 5–8 people. Start at Albatross, then follow the lanterns.',
    location: { nameEnglish: 'Golden Gai', nameLocal: 'ゴールデン街', city: 'Shinjuku, Tokyo', country: 'Japan' },
    imageUrl: wiki('8/8d/G2_Street_20090626_2.jpg/330px-G2_Street_20090626_2.jpg'),
    tags: ['bar', 'nightlife'],
    confidence: 'medium',
    sourceUrl: 'https://www.tiktok.com/',
    creator: 'nightcity.jp',
    pinPosition: { x: 0, y: 0, rotation: 1.5 },
  },
  {
    source: 'youtube',
    title: 'Ichiran — solo-booth tonkotsu ramen',
    description: 'Order from a vending machine, slide into your own booth, and slurp the famous tonkotsu broth. Open 24h in Shibuya.',
    location: { nameEnglish: 'Ichiran Ramen', nameLocal: '一蘭', city: 'Shibuya, Tokyo', country: 'Japan' },
    tags: ['ramen', 'restaurant'],
    confidence: 'high',
    sourceUrl: 'https://www.youtube.com/',
    creator: 'EatsOfJapan',
    pinPosition: { x: 0, y: 0, rotation: -1.5 },
  },
  {
    source: 'instagram',
    title: 'Shinjuku Gyoen picnic under the trees',
    description: 'Three gardens in one — French, English, and Japanese. ¥500 entry buys you the calmest afternoon in Tokyo.',
    location: { nameEnglish: 'Shinjuku Gyoen', nameLocal: '新宿御苑', city: 'Shinjuku, Tokyo', country: 'Japan' },
    imageUrl: wiki('9/9d/Shinjuku_Gyoen_National_Garden_-_sakura_3.JPG/330px-Shinjuku_Gyoen_National_Garden_-_sakura_3.JPG'),
    tags: ['garden', 'nature', 'park'],
    confidence: 'high',
    sourceUrl: 'https://www.instagram.com/',
    creator: 'slowtravel.tokyo',
    pinPosition: { x: 0, y: 0, rotation: 2 },
  },
  {
    source: 'ai',
    title: 'Akihabara Electric Town after dark',
    description: 'Anime, retro game arcades, and electronics stacked seven storeys high. Super Potato is the retro-gaming mecca.',
    location: { nameEnglish: 'Akihabara', nameLocal: '秋葉原', city: 'Chiyoda, Tokyo', country: 'Japan' },
    imageUrl: wiki('6/60/Sotokanda%2C_Akihabara_Electric_Town_at_night_20231114.png/330px-Sotokanda%2C_Akihabara_Electric_Town_at_night_20231114.png'),
    tags: ['shopping', 'arcade'],
    confidence: 'medium',
    pinPosition: { x: 0, y: 0, rotation: -1 },
  },
  {
    source: 'article',
    title: 'Ghibli Museum — book a month ahead',
    description: 'Miyazaki\'s whimsical museum in Mitaka. Tickets sell out fast — they go on sale on the 10th of each month.',
    location: { nameEnglish: 'Ghibli Museum', nameLocal: '三鷹の森ジブリ美術館', city: 'Mitaka, Tokyo', country: 'Japan' },
    imageUrl: wiki('4/45/Ghibli_Museum_2024.JPG/500px-Ghibli_Museum_2024.JPG'),
    tags: ['museum', 'culture', 'art'],
    confidence: 'high',
    sourceUrl: 'https://www.ghibli-museum.jp/en/',
    pinPosition: { x: 0, y: 0, rotation: -1.5 },
  },
]

export function buildDemoCards(): TravelCard[] {
  const now = new Date().toISOString()
  return DEMO_CARD_SEEDS.map((seed, i) => ({
    ...seed,
    id: `demo-card-${i}`,
    tripId: DEMO_TRIP_ID,
    savedAt: now,
  }))
}

export function buildDemoNote(): StickyNote {
  return {
    id: 'demo-note-1',
    tripId: DEMO_TRIP_ID,
    text: 'Get a Suica card at the airport! 🚆\nCash for Golden Gai bars',
    color: 'yellow',
    position: { x: 700, y: 660, rotation: 2 },
    createdAt: new Date().toISOString(),
  }
}

export function buildDemoItinerary(trip: TripContext): GeneratedItinerary {
  const d = (offset: number) => {
    const date = new Date(trip.startDate)
    date.setDate(date.getDate() + offset)
    return date.toISOString().split('T')[0]
  }
  return {
    tripId: DEMO_TRIP_ID,
    destination: trip.destination,
    totalDays: 4,
    overview:
      'Four days weaving Tokyo\'s old soul and electric present — dawn temples and forest shrines, ramen counters and izakaya alleys, ending high above the neon grid. Routes are grouped by neighbourhood so you ride the train less and wander more.',
    totalEstimatedCost: '~$95–130 per person / day',
    generalTips: [
      'Get a Suica/Pasmo IC card at the airport — it works on every train, bus, and konbini.',
      'Many small bars and ramen shops are cash-only; carry ¥10,000 in small notes.',
      'Trains stop around midnight — plan your Golden Gai night near your hotel or budget for a taxi.',
      'Convenience-store breakfast (onigiri + coffee) is genuinely great and costs ~¥500.',
    ],
    days: [
      {
        day: 1,
        date: d(0),
        theme: 'Old Tokyo: Asakusa & the Skytree',
        estimatedCost: '~$90 pp',
        morning: [
          { time: '8:00 AM', activity: 'Sensō-ji Temple before the crowds', place: 'Senso-ji, 2-3-1 Asakusa, Taito City', duration: '1.5 hours', notes: 'Main hall opens 6 AM — arrive early for incense and quiet photos', bookingRequired: false, category: 'activity' },
          { time: '9:30 AM', activity: 'Snack crawl down Nakamise-dōri', place: 'Nakamise Shopping Street, Asakusa', duration: '1 hour', notes: 'Try age-manju (fried bean-paste buns) and fresh senbei', bookingRequired: false, category: 'meal' },
        ],
        afternoon: [
          { time: '12:00 PM', activity: 'Tempura lunch at a 130-year-old counter', place: 'Daikokuya Tempura, Asakusa', duration: '1 hour', notes: 'Queue moves fast; go before 12:30', bookingRequired: false, category: 'meal' },
          { time: '2:00 PM', activity: 'Walk the Sumida River to the Skytree', place: 'Sumida River Walk → Tokyo Skytree', duration: '45 min', notes: 'Flat riverside path with skyline views', bookingRequired: false, category: 'transport' },
          { time: '3:00 PM', activity: 'Tokyo Skytree observation deck', place: 'Tokyo Skytree, 1-1-2 Oshiage, Sumida', duration: '2 hours', notes: 'Book the 350 m Tembo Deck online to skip the queue', bookingRequired: true, category: 'activity' },
        ],
        evening: [
          { time: '6:30 PM', activity: 'Izakaya dinner under the train tracks', place: 'Hoppy Street, Asakusa', duration: '2 hours', notes: 'Order hoppy (the local low-alcohol beer) like a regular', bookingRequired: false, category: 'meal' },
        ],
        meals: { breakfast: 'Street snacks on Nakamise-dōri', lunch: 'Daikokuya tempura don', dinner: 'Hoppy Street izakaya skewers' },
        travelTips: ['Asakusa is best on foot — pick up a paper map at the Culture Tourist Information Center (free observation deck on 8F).'],
      },
      {
        day: 2,
        date: d(1),
        theme: 'Forest Shrines & Shibuya Neon',
        estimatedCost: '~$100 pp',
        morning: [
          { time: '9:00 AM', activity: 'Meiji Shrine forest walk', place: 'Meiji Jingu, 1-1 Yoyogikamizonocho, Shibuya', duration: '1.5 hours', notes: 'Write a wish on an ema plaque; sake barrel wall photo stop', bookingRequired: false, category: 'activity' },
          { time: '10:45 AM', activity: 'Stroll Takeshita Street & Omotesandō', place: 'Harajuku', duration: '1.5 hours', notes: 'Crepes on Takeshita, architecture on Omotesandō', bookingRequired: false, category: 'activity' },
        ],
        afternoon: [
          { time: '1:00 PM', activity: 'Picnic in Shinjuku Gyoen', place: 'Shinjuku Gyoen National Garden', duration: '2 hours', notes: '¥500 entry; grab depachika bento from Takashimaya first', bookingRequired: false, category: 'rest' },
          { time: '3:30 PM', activity: 'Shibuya Crossing + Hachikō statue', place: 'Shibuya Scramble Crossing', duration: '1 hour', notes: 'Best aerial view: Shibuya Sky or Mag\'s Park rooftop', bookingRequired: false, category: 'activity' },
        ],
        evening: [
          { time: '6:00 PM', activity: 'Solo-booth ramen experience', place: 'Ichiran Ramen, Shibuya', duration: '45 min', notes: 'Order extra kaedama (noodle refill) from the booth', bookingRequired: false, category: 'meal' },
          { time: '8:00 PM', activity: 'Bar-hop the Golden Gai alleys', place: 'Golden Gai, Shinjuku', duration: '3 hours', notes: 'Most bars charge a ¥500–1000 seat fee; cash only', bookingRequired: false, category: 'activity' },
        ],
        meals: { breakfast: 'Konbini onigiri + coffee', lunch: 'Depachika bento picnic', dinner: 'Ichiran tonkotsu ramen' },
        travelTips: ['Harajuku → Shinjuku Gyoen → Shibuya is one short loop on the JR Yamanote line.'],
      },
      {
        day: 3,
        date: d(2),
        theme: 'Ghibli Whimsy & Electric Town',
        estimatedCost: '~$110 pp',
        morning: [
          { time: '10:00 AM', activity: 'Ghibli Museum', place: 'Ghibli Museum, 1-1-83 Shimorenjaku, Mitaka', duration: '2.5 hours', notes: 'Timed-entry tickets only — buy on the 10th of the prior month', bookingRequired: true, category: 'activity' },
        ],
        afternoon: [
          { time: '1:00 PM', activity: 'Lunch & stroll in Kichijōji', place: 'Harmonica Yokocho, Kichijoji', duration: '1.5 hours', notes: 'Tiny post-war market lanes turned food stalls', bookingRequired: false, category: 'meal' },
          { time: '3:30 PM', activity: 'Akihabara retro-game & anime dive', place: 'Akihabara Electric Town, Chiyoda', duration: '2.5 hours', notes: 'Super Potato for retro games; Yodobashi for everything else', bookingRequired: false, category: 'activity' },
        ],
        evening: [
          { time: '7:00 PM', activity: 'Conveyor-belt sushi dinner', place: 'Uobei / Genki Sushi, Akihabara area', duration: '1 hour', notes: 'Order by tablet, plates arrive by bullet rail', bookingRequired: false, category: 'meal' },
          { time: '8:30 PM', activity: 'Arcade night — rhythm games & UFO catchers', place: 'GiGO Akihabara', duration: '1.5 hours', notes: '100-yen coins are your friend', bookingRequired: false, category: 'activity' },
        ],
        meals: { breakfast: 'Hotel or kissaten morning set', lunch: 'Harmonica Yokocho stalls', dinner: 'Conveyor-belt sushi' },
        travelTips: ['Mitaka is 20 min from Shinjuku on the JR Chūō line; the museum shuttle bus leaves from the station\'s south exit.'],
      },
      {
        day: 4,
        date: d(3),
        theme: 'Market Morning & Sayonara Views',
        estimatedCost: '~$85 pp',
        morning: [
          { time: '8:30 AM', activity: 'Tsukiji Outer Market food crawl', place: 'Tsukiji Outer Market, Chuo City', duration: '2 hours', notes: 'Tamago-yaki skewers, uni bowls, and knife shops', bookingRequired: false, category: 'meal' },
          { time: '11:00 AM', activity: 'Hamarikyu Gardens tea house', place: 'Hama-rikyu Gardens', duration: '1.5 hours', notes: 'Matcha + wagashi in the pond-side tea house (¥1000)', bookingRequired: false, category: 'rest' },
        ],
        afternoon: [
          { time: '1:30 PM', activity: 'Last-minute shopping in Ginza', place: 'Ginza Six & Uniqlo flagship', duration: '2 hours', notes: 'Tax-free counters need your passport', bookingRequired: false, category: 'activity' },
        ],
        evening: [
          { time: '5:00 PM', activity: 'Golden-hour skyline farewell', place: 'Shibuya Sky observation deck', duration: '1.5 hours', notes: 'Book the 4:30–5:00 slot for sunset; bring a jacket', bookingRequired: true, category: 'activity' },
          { time: '7:30 PM', activity: 'Farewell dinner — okonomiyaki you grill yourself', place: 'Sakura-tei, Harajuku', duration: '1.5 hours', notes: 'Staff will rescue your flip technique', bookingRequired: false, category: 'meal' },
        ],
        meals: { breakfast: 'Tsukiji market grazing', lunch: 'Light Ginza café stop', dinner: 'DIY okonomiyaki at Sakura-tei' },
        travelTips: ['Ship luggage to the airport with takkyubin (¥2000) from any konbini and travel hands-free on your last day.'],
      },
    ],
  }
}

/** Seed (or re-seed) the demo trip into the local store. Safe to call repeatedly. */
export async function seedDemo(): Promise<string> {
  const { useTripStore } = await import('./store')
  const trip = buildDemoTrip()

  useTripStore.setState((s) => ({
    trips: [...s.trips.filter((t) => t.id !== DEMO_TRIP_ID), trip],
    cards: { ...s.cards, [DEMO_TRIP_ID]: buildDemoCards() },
    notes: { ...s.notes, [DEMO_TRIP_ID]: s.notes[DEMO_TRIP_ID]?.length ? s.notes[DEMO_TRIP_ID] : [buildDemoNote()] },
    itineraries: { ...s.itineraries, [DEMO_TRIP_ID]: buildDemoItinerary(trip) },
  }))

  return DEMO_TRIP_ID
}
