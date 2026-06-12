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
export type CardSource = 'youtube' | 'tiktok' | 'instagram' | 'article' | 'ai' | 'manual'

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

export interface ItineraryTimeBlock {
  time: string
  activity: string
  place: string
  duration: string
  notes?: string
  bookingRequired?: boolean
  category: 'activity' | 'meal' | 'transport' | 'rest'
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
}

export interface GeneratedItinerary {
  tripId: string
  destination: string
  totalDays: number
  overview: string
  days: ItineraryDay[]
  generalTips: string[]
  totalEstimatedCost?: string
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

export interface TripBudget {
  total?: number
  flightPerPerson?: number
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
  infants: 'Infants (0–2)',
  kids: 'Kids (3–12)',
  teens: 'Teens (13–17)',
  adults: 'Adults (18–59)',
  seniors: 'Seniors (60+)',
}

export const OBJECTIVE_LABELS: Record<TripObjective, { label: string; icon: string }> = {
  relaxation: { label: 'Relaxation', icon: '🏖️' },
  adventure: { label: 'Adventure', icon: '🧗' },
  food: { label: 'Food & Drink', icon: '🍜' },
  culture: { label: 'Culture & History', icon: '🏛️' },
  nightlife: { label: 'Nightlife', icon: '🎉' },
  nature: { label: 'Nature', icon: '🌿' },
  shopping: { label: 'Shopping', icon: '🛍️' },
  wellness: { label: 'Wellness', icon: '🧘' },
  romance: { label: 'Romance', icon: '💕' },
  budget: { label: 'Budget Travel', icon: '💰' },
}

export const PRICE_RANGE_LABELS: Record<PriceRange, { label: string; desc: string }> = {
  budget: { label: 'Budget', desc: 'Under $80/night' },
  mid: { label: 'Mid-range', desc: '$80–$250/night' },
  luxury: { label: 'Luxury', desc: '$250+/night' },
}
