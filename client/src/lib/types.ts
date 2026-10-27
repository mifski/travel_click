import {
  TreePalm, Mountain, UtensilsCrossed, Landmark, Martini, Leaf, ShoppingBag, Flower2, Heart, Wallet,
  type LucideIcon,
} from 'lucide-react'

export type AgeRange = 'infants' | 'kids' | 'teens' | 'adults' | 'seniors'
export type TripObjective =
  | 'relaxation'
  | 'adventure'
  | 'food'
  | 'culture'
  | 'nightlife'
  | 'nature'
  | 'shopping'
  | 'wellness'
  | 'romance'
  | 'budget'
export type PriceRange = 'budget' | 'mid' | 'luxury'
export type CardSource = 'youtube' | 'tiktok' | 'instagram' | 'xiaohongshu' | 'article' | 'ai' | 'manual'
export type TripPace = 'slow' | 'balanced' | 'full'
/** Classic-to-gems dial: 0 = famous icons only … 4 = hidden gems only */
export type TripDiscovery = 0 | 1 | 2 | 3 | 4

export const DISCOVERY_LABELS: Record<TripDiscovery, string> = {
  0: 'Icons only',
  1: 'Mostly classics',
  2: 'Half & half',
  3: 'Mostly gems',
  4: 'Gems only',
}

export interface TripContext {
  id: string
  destination: string
  country: string
  startDate: string
  endDate: string
  paxCount: number
  ageRanges: AgeRange[]
  objectives: TripObjective[]
  priceRange: PriceRange
  createdAt: string
  pace?: TripPace
  dayStart?: string // "09:00"
  discovery?: TripDiscovery
  homeBase?: string // hotel name or neighbourhood every day starts and ends at
}

export interface CardLocation {
  nameEnglish: string
  nameLocal?: string
  city?: string
  country?: string
}

export interface PinPosition {
  x: number
  y: number
  rotation: number
}

export interface TravelCard {
  id: string
  tripId: string
  source: CardSource
  title: string
  description: string
  location: CardLocation
  imageUrl?: string
  thumbnailUrl?: string
  tags: string[]
  confidence?: 'high' | 'medium' | 'low'
  sourceUrl?: string
  creator?: string
  duration?: string
  pinPosition: PinPosition
  savedAt: string
  metadata?: Record<string, unknown>
}

export interface AccommodationSuggestion {
  id: string
  name: string
  type: 'hotel' | 'hostel' | 'villa' | 'ryokan' | 'resort' | 'apartment' | 'boutique'
  description: string
  whyItFits: string
  priceTier: PriceRange
  estimatedPricePerNight: string
  bookingUrl: string
  highlights: string[]
  imageUrl?: string
}

/** How much a pin matters when planning: always in, in only if it fits, or left out */
export type PinPriority = 'must' | 'maybe' | 'skip'

/** Somewhere the travellers have booked to sleep; nights run checkIn → checkOut (morning) */
export interface TripStay {
  id: string
  name: string
  area?: string // neighbourhood or nearest station
  checkIn: string // YYYY-MM-DD
  checkOut: string
}

/** Stays panel state per trip: AI picks plus the stays the travellers entered */
export interface TripStays {
  suggestions: AccommodationSuggestion[]
  suggestedAt?: string
  booked: TripStay[]
}

export interface ItineraryTimeBlock {
  time: string
  activity: string
  place: string
  duration: string
  notes?: string
  bookingRequired?: boolean
  category: 'activity' | 'meal' | 'transport' | 'rest'
  /** Board card this block visits, when it came from one */
  cardId?: string
}

export interface ItineraryDay {
  day: number
  date: string
  theme: string
  morning: ItineraryTimeBlock[]
  afternoon: ItineraryTimeBlock[]
  evening: ItineraryTimeBlock[]
  meals: { breakfast?: string; lunch?: string; dinner?: string }
  travelTips: string[]
  weatherNote?: string
  estimatedCost?: string
  anchor?: string
  backups?: { rain?: string; tired?: string }
}

/* ── v2.2 Reality Layer ── */

export interface RealityFinding {
  severity: 'fix' | 'look'
  reason: string
  fix: string
}

/** A key fact (hours, closure, fare, timetable). AI-sourced, so unverified until the user checks it. */
export interface RealityFact {
  key: string
  text: string
  sourceUrl?: string
}

export interface BookingStub {
  key: string
  item: string
  day: number
  opensOn?: string // YYYY-MM-DD
  bookBy?: string
  dateBasis: 'estimated' | 'unknown'
  sourceUrl?: string
  /** How it's booked; walk-in-only items never become tickets */
  how?: BookingChannel
  /** Short venue name, so the same place on several days merges into one ticket */
  venue?: string
}

export type BookingChannel = 'official-site' | 'phone' | 'agent' 

export type StubStatus = 'to-book' | 'booked' | 'pay-on-day'

export interface RealityReport {
  tripId: string
  checkedAt: string
  /** sig = fingerprint of the day as checked; findings for a day that has since changed are stale */
  days: { day: number; sig?: string; findings: RealityFinding[]; facts: RealityFact[] }[]
  stubs: BookingStub[]
}

/** User confirmations that outlive a regenerate: stub status, fact checked-on date, dismissed findings */
export interface RealityMarks {
  stubs: Record<string, StubStatus>
  facts: Record<string, string>
  dismissed: Record<string, true>
  /** Confirmation numbers by ticket key (optional: older saved marks don't have it) */
  confirmations?: Record<string, string>
}

/** Pin passport: the practical facts for one saved place. AI-sourced, so unverified. */
export interface PinPassport {
  cardId: string
  stampedAt: string
  kind: 'classic' | 'in-between' | 'gem'
  hours: string
  bestTime: string
  timeNeeded: string
  price: string
  booking: string
  tip: string
  sourceUrl?: string
}

export interface GeneratedItinerary {
  tripId: string
  destination: string
  totalDays: number
  overview: string
  days: ItineraryDay[]
  generalTips: string[]
  totalEstimatedCost?: string
  /** "If it fits" pins the plan left out, offered back as swaps */
  unusedPins?: string[]
}

export interface StickyNote {
  id: string
  tripId: string
  text: string
  color: StickyColor
  position: PinPosition
  createdAt: string
}

export type StickyColor = 'yellow' | 'pink' | 'blue' | 'green'

export const STICKY_COLORS: Record<StickyColor, { bg: string; edge: string; text: string }> = {
  yellow: { bg: '#fef3a8', edge: '#e8d840', text: '#5c4a10' },
  pink:   { bg: '#fcd5e0', edge: '#e8a8b8', text: '#7a2a45' },
  blue:   { bg: '#cfe3f5', edge: '#7e9ab5', text: '#2a4a6a' },
  green:  { bg: '#d8ecca', edge: '#6b8f5e', text: '#33531f' },
}

export interface PackingItem {
  id: string
  label: string
  checked: boolean
  note?: string
}

export interface PackingCategory {
  name: string
  icon: string
  items: PackingItem[]
}

export interface PackingList {
  tripId: string
  generatedAt: string
  categories: PackingCategory[]
}

export type TempPreference = 'cold' | 'mild' | 'warm' | 'any'

export interface MonthOutlook {
  month: string
  tempLowC: number
  tempHighC: number
  rain: 'low' | 'medium' | 'high'
  crowds: 'low' | 'medium' | 'high'
  note?: string
}

export interface DestinationScore {
  destination: string
  country: string
  iata?: string
  months: MonthOutlook[]
  // Field names predate the SGD switch; kept so saved comparisons still load. Values are S$ strings.
  dailyCostUSD: string
  hotelNightUSD: string
  flightNote: string
  visaNote: string
  vibe: string
  highlights: string[]
  watchouts: string[]
  fitScore: number
  fitReason: string
}

export interface DestinationComparison {
  id: string
  createdAt: string
  candidates: string[]
  months: string[]
  tempPref: TempPreference
  priorities: string[]
  travelerNote?: string
  paxCount: number
  results: DestinationScore[]
  verdict: { winner: string; bestMonth: string; reasoning: string; runnerUp?: string }
}

export interface BookedFlight {
  id: string
  leg: 'outbound' | 'return' | 'other'
  flightNo: string
  from: string
  to: string
  departAt: string // local "YYYY-MM-DDTHH:mm"
  arriveAt: string
  price?: number // S$ paid for the whole group
}

export interface TripBudget {
  total?: number
  flightPerPerson?: number
  flights?: BookedFlight[]
}

export interface BriefPhrase {
  local: string
  english: string
  phonetic: string
}

export interface TravelBrief {
  tripId: string
  destination: string
  generatedAt: string
  currency: { name: string; code: string; cashCulture: string; exchangeTip: string }
  language: { name: string; phrases: BriefPhrase[] }
  power: { plugType: string; voltage: string; note: string }
  tipping: string
  gettingAround: string[]
  etiquette: { dos: string[]; donts: string[] }
  emergency: { police: string; ambulance: string; note: string }
  neighbourhoods: { name: string; why: string }[]
}

export const AGE_RANGE_LABELS: Record<AgeRange, string> = {
  infants: 'Infants (0-2)',
  kids: 'Kids (3-12)',
  teens: 'Teens (13-17)',
  adults: 'Adults (18-59)',
  seniors: 'Seniors (60+)',
}

export const OBJECTIVE_LABELS: Record<TripObjective, { label: string; icon: LucideIcon }> = {
  relaxation: { label: 'Relaxation', icon: TreePalm },
  adventure: { label: 'Adventure', icon: Mountain },
  food: { label: 'Food & Drink', icon: UtensilsCrossed },
  culture: { label: 'Culture & History', icon: Landmark },
  nightlife: { label: 'Nightlife', icon: Martini },
  nature: { label: 'Nature', icon: Leaf },
  shopping: { label: 'Shopping', icon: ShoppingBag },
  wellness: { label: 'Wellness', icon: Flower2 },
  romance: { label: 'Romance', icon: Heart },
  budget: { label: 'Budget Travel', icon: Wallet },
}

export const PRICE_RANGE_LABELS: Record<PriceRange, { label: string; desc: string }> = {
  budget: { label: 'Budget', desc: 'Under S$110/night' },
  mid: { label: 'Mid-range', desc: 'S$110-S$340/night' },
  luxury: { label: 'Luxury', desc: 'S$340+/night' },
}
