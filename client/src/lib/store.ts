'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  TripContext, TravelCard, GeneratedItinerary, AgeRange, TripObjective, PriceRange,
  StickyNote, StickyColor, PackingList, TravelBrief, DestinationComparison, TripBudget,
  RealityReport, RealityMarks, StubStatus, PinPassport,
} from './types'
import { generateId, generatePinPosition, randomInRange } from './utils'
import { DEMO_TRIP_ID } from './demo-data'
import { EMPTY_MARKS } from './reality'

interface TripStore {
  trips: TripContext[]
  cards: Record<string, TravelCard[]>
  itineraries: Record<string, GeneratedItinerary>
  notes: Record<string, StickyNote[]>
  packingLists: Record<string, PackingList>
  briefs: Record<string, TravelBrief>
  budgets: Record<string, TripBudget>
  realityChecks: Record<string, RealityReport>
  realityMarks: Record<string, RealityMarks>
  passports: Record<string, Record<string, PinPassport>>
  /** Last change time per "tripId:kind", local or pulled — cloud sync's newest-wins clock */
  syncStamps: Record<string, string>
  lastComparison: DestinationComparison | null
  activeSetup: Partial<TripContext>

  // Setup actions
  setSetupField: <K extends keyof TripContext>(key: K, value: TripContext[K]) => void
  toggleAgeRange: (range: AgeRange) => void
  toggleObjective: (obj: TripObjective) => void
  setPriceRange: (range: PriceRange) => void
  createTrip: () => TripContext

  // Trip sync
  hydrateTrips: (trips: TripContext[]) => void
  hydrateCards: (tripId: string, cards: TravelCard[]) => void
  removeTripLocal: (tripId: string) => void
  addTrip: (trip: TripContext) => void
  updateTrip: (tripId: string, patch: Partial<TripContext>) => void

  // Destination comparison + budget
  saveComparison: (cmp: DestinationComparison) => void
  setBudget: (tripId: string, budget: TripBudget) => void

  // Card actions
  addCard: (tripId: string, card: Omit<TravelCard, 'id' | 'tripId' | 'pinPosition' | 'savedAt'>) => TravelCard
  removeCard: (tripId: string, cardId: string) => void
  /** A collaborator's change arrived: add/replace or drop a pin without echoing it back */
  upsertCardLocal: (card: TravelCard) => void
  dropCardLocal: (tripId: string, cardId: string) => void
  updateCardPosition: (tripId: string, cardId: string, pos: TravelCard['pinPosition']) => void
  getTripCards: (tripId: string) => TravelCard[]

  // Sticky notes
  addNote: (tripId: string, text?: string, color?: StickyColor) => StickyNote
  updateNoteText: (tripId: string, noteId: string, text: string) => void
  updateNotePosition: (tripId: string, noteId: string, pos: StickyNote['position']) => void
  removeNote: (tripId: string, noteId: string) => void

  // Packing
  savePackingList: (list: PackingList) => void
  togglePackingItem: (tripId: string, itemId: string) => void

  // Brief
  saveBrief: (brief: TravelBrief) => void

  // Itinerary
  saveItinerary: (itinerary: GeneratedItinerary) => void
  getItinerary: (tripId: string) => GeneratedItinerary | null

  // Reality layer
  saveRealityCheck: (report: RealityReport) => void
  setStubStatus: (tripId: string, key: string, status: StubStatus) => void
  markFactChecked: (tripId: string, key: string) => void
  dismissFinding: (tripId: string, key: string) => void

  // Pin passport
  savePassport: (tripId: string, passport: PinPassport) => void

  // Cloud sync
  applyCloud: (tripId: string, kind: SyncKind, data: unknown, stamp: string) => void
  setSyncStamp: (key: string, stamp: string) => void

  // Helpers
  getTrip: (tripId: string) => TripContext | null
  resetSetup: () => void
}

export const SYNC_KINDS = [
  'notes', 'budget', 'itinerary', 'packing', 'brief', 'reality', 'marks', 'passports', 'settings', 'positions',
] as const
export type SyncKind = typeof SYNC_KINDS[number]

/** Trip fields that only live in the trip_data table (the trips table predates them) */
export type TripSettings = Pick<TripContext, 'pace' | 'dayStart' | 'discovery' | 'homeBase'>

const DEFAULT_SETUP: Partial<TripContext> = {
  ageRanges: ['adults'],
  objectives: [],
  priceRange: 'mid',
  paxCount: 2,
}

/** Fire-and-forget Supabase card sync — no-op when signed out or in demo */
async function syncCardSave(card: TravelCard) {
  if (card.tripId === DEMO_TRIP_ID) return
  try {
    const { isSupabaseReady, supabase, saveCard } = await import('./supabase')
    if (!isSupabaseReady) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return
    await saveCard({
      id: card.id,
      trip_id: card.tripId,
      user_id: session.user.id,
      source: card.source,
      title: card.title,
      description: card.description,
      location_data: card.location as unknown as Record<string, unknown>,
      image_url: card.imageUrl ?? null,
      thumbnail_url: card.thumbnailUrl ?? null,
      tags: card.tags,
      confidence: card.confidence ?? null,
      source_url: card.sourceUrl ?? null,
      creator: card.creator ?? null,
      pin_position: card.pinPosition,
      saved_at: card.savedAt,
    })
  } catch { /* offline / RLS — local copy is the source of truth */ }
}

async function syncCardDelete(tripId: string, cardId: string) {
  if (tripId === DEMO_TRIP_ID) return
  try {
    const { isSupabaseReady, supabase, deleteCard } = await import('./supabase')
    if (!isSupabaseReady) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return
    await deleteCard(cardId)
  } catch { /* ignore */ }
}

function patchMarks<K extends keyof RealityMarks>(
  s: TripStore, tripId: string, field: K, key: string, value: RealityMarks[K][string]
): Partial<TripStore> {
  const marks = s.realityMarks[tripId] ?? EMPTY_MARKS
  return {
    realityMarks: { ...s.realityMarks, [tripId]: { ...marks, [field]: { ...marks[field], [key]: value } } },
  }
}

export const useTripStore = create<TripStore>()(
  persist(
    (set, get) => ({
      trips: [],
      cards: {},
      itineraries: {},
      notes: {},
      packingLists: {},
      briefs: {},
      budgets: {},
      realityChecks: {},
      realityMarks: {},
      passports: {},
      syncStamps: {},
      lastComparison: null,
      activeSetup: { ...DEFAULT_SETUP },

      setSetupField: (key, value) =>
        set((s) => ({ activeSetup: { ...s.activeSetup, [key]: value } })),

      toggleAgeRange: (range) =>
        set((s) => {
          const current = s.activeSetup.ageRanges ?? []
          const next = current.includes(range)
            ? current.filter((r) => r !== range)
            : [...current, range]
          return { activeSetup: { ...s.activeSetup, ageRanges: next } }
        }),

      toggleObjective: (obj) =>
        set((s) => {
          const current = s.activeSetup.objectives ?? []
          const next = current.includes(obj)
            ? current.filter((o) => o !== obj)
            : current.length < 3
            ? [...current, obj]
            : current
          return { activeSetup: { ...s.activeSetup, objectives: next } }
        }),

      setPriceRange: (range) =>
        set((s) => ({ activeSetup: { ...s.activeSetup, priceRange: range } })),

      createTrip: () => {
        const setup = get().activeSetup
        const trip: TripContext = {
          id: generateId(),
          destination: setup.destination ?? '',
          country: setup.country ?? '',
          startDate: setup.startDate ?? new Date().toISOString().split('T')[0],
          endDate: setup.endDate ?? new Date().toISOString().split('T')[0],
          paxCount: setup.paxCount ?? 2,
          ageRanges: setup.ageRanges ?? ['adults'],
          objectives: setup.objectives ?? [],
          priceRange: setup.priceRange ?? 'mid',
          createdAt: new Date().toISOString(),
        }
        set((s) => ({ trips: [...s.trips, trip], activeSetup: { ...DEFAULT_SETUP } }))
        return trip
      },

      addTrip: (trip) =>
        set((s) => ({ trips: [...s.trips.filter((t) => t.id !== trip.id), trip] })),

      updateTrip: (tripId, patch) =>
        set((s) => ({ trips: s.trips.map((t) => (t.id === tripId ? { ...t, ...patch } : t)) })),

      saveComparison: (cmp) => set({ lastComparison: cmp }),

      setBudget: (tripId, budget) =>
        set((s) => ({ budgets: { ...s.budgets, [tripId]: { ...s.budgets[tripId], ...budget } } })),

      hydrateTrips: (incoming) =>
        set((s) => {
          const known = new Set(s.trips.map((t) => t.id))
          const fresh = incoming.filter((t) => !known.has(t.id))
          return fresh.length ? { trips: [...s.trips, ...fresh] } : {}
        }),

      // Cloud cards merge under local ones — local copies may hold newer drag positions
      hydrateCards: (tripId, incoming) =>
        set((s) => {
          const existing = s.cards[tripId] ?? []
          const known = new Set(existing.map((c) => c.id))
          const fresh = incoming.filter((c) => !known.has(c.id))
          return fresh.length ? { cards: { ...s.cards, [tripId]: [...existing, ...fresh] } } : {}
        }),

      removeTripLocal: (tripId) =>
        set((s) => {
          const omit = <T,>(rec: Record<string, T>): Record<string, T> => {
            const { [tripId]: _drop, ...rest } = rec
            return rest
          }
          return {
            trips: s.trips.filter((t) => t.id !== tripId),
            cards: omit(s.cards),
            itineraries: omit(s.itineraries),
            notes: omit(s.notes),
            packingLists: omit(s.packingLists),
            briefs: omit(s.briefs),
            budgets: omit(s.budgets),
            realityChecks: omit(s.realityChecks),
            realityMarks: omit(s.realityMarks),
            passports: omit(s.passports),
          }
        }),

      addCard: (tripId, cardData) => {
        const card: TravelCard = {
          ...cardData,
          id: generateId(),
          tripId,
          savedAt: new Date().toISOString(),
          pinPosition: generatePinPosition(),
        }
        set((s) => ({
          cards: { ...s.cards, [tripId]: [...(s.cards[tripId] ?? []), card] },
        }))
        void syncCardSave(card)
        return card
      },

      removeCard: (tripId, cardId) => {
        set((s) => ({
          cards: {
            ...s.cards,
            [tripId]: (s.cards[tripId] ?? []).filter((c) => c.id !== cardId),
          },
        }))
        void syncCardDelete(tripId, cardId)
      },

      upsertCardLocal: (card) =>
        set((s) => {
          const list = s.cards[card.tripId] ?? []
          const existing = list.find((c) => c.id === card.id)
          // Keep the local position: positions sync separately and may be newer here
          const next = existing
            ? list.map((c) => (c.id === card.id ? { ...card, pinPosition: c.pinPosition } : c))
            : [...list, card]
          return { cards: { ...s.cards, [card.tripId]: next } }
        }),

      dropCardLocal: (tripId, cardId) =>
        set((s) => ({ cards: { ...s.cards, [tripId]: (s.cards[tripId] ?? []).filter((c) => c.id !== cardId) } })),

      updateCardPosition: (tripId, cardId, pos) =>
        set((s) => ({
          cards: {
            ...s.cards,
            [tripId]: (s.cards[tripId] ?? []).map((c) =>
              c.id === cardId ? { ...c, pinPosition: pos } : c
            ),
          },
        })),

      getTripCards: (tripId) => get().cards[tripId] ?? [],

      addNote: (tripId, text = '', color = 'yellow') => {
        const count = (get().notes[tripId] ?? []).length
        const note: StickyNote = {
          id: generateId(),
          tripId,
          text,
          color,
          position: {
            x: 40 + (count % 4) * 60 + randomInRange(0, 30),
            y: 40 + (count % 3) * 50 + randomInRange(0, 30),
            rotation: randomInRange(-5, 5),
          },
          createdAt: new Date().toISOString(),
        }
        set((s) => ({ notes: { ...s.notes, [tripId]: [...(s.notes[tripId] ?? []), note] } }))
        return note
      },

      updateNoteText: (tripId, noteId, text) =>
        set((s) => ({
          notes: {
            ...s.notes,
            [tripId]: (s.notes[tripId] ?? []).map((n) => (n.id === noteId ? { ...n, text } : n)),
          },
        })),

      updateNotePosition: (tripId, noteId, pos) =>
        set((s) => ({
          notes: {
            ...s.notes,
            [tripId]: (s.notes[tripId] ?? []).map((n) => (n.id === noteId ? { ...n, position: pos } : n)),
          },
        })),

      removeNote: (tripId, noteId) =>
        set((s) => ({
          notes: { ...s.notes, [tripId]: (s.notes[tripId] ?? []).filter((n) => n.id !== noteId) },
        })),

      savePackingList: (list) =>
        set((s) => ({ packingLists: { ...s.packingLists, [list.tripId]: list } })),

      togglePackingItem: (tripId, itemId) =>
        set((s) => {
          const list = s.packingLists[tripId]
          if (!list) return {}
          return {
            packingLists: {
              ...s.packingLists,
              [tripId]: {
                ...list,
                categories: list.categories.map((cat) => ({
                  ...cat,
                  items: cat.items.map((it) => (it.id === itemId ? { ...it, checked: !it.checked } : it)),
                })),
              },
            },
          }
        }),

      saveBrief: (brief) =>
        set((s) => ({ briefs: { ...s.briefs, [brief.tripId]: brief } })),

      saveItinerary: (itinerary) =>
        set((s) => ({
          itineraries: { ...s.itineraries, [itinerary.tripId]: itinerary },
        })),

      getItinerary: (tripId) => get().itineraries[tripId] ?? null,

      saveRealityCheck: (report) =>
        set((s) => ({ realityChecks: { ...s.realityChecks, [report.tripId]: report } })),

      setStubStatus: (tripId, key, status) => set((s) => patchMarks(s, tripId, 'stubs', key, status)),
      markFactChecked: (tripId, key) =>
        set((s) => patchMarks(s, tripId, 'facts', key, new Date().toISOString().slice(0, 10))),
      dismissFinding: (tripId, key) => set((s) => patchMarks(s, tripId, 'dismissed', key, true)),

      savePassport: (tripId, passport) =>
        set((s) => ({ passports: { ...s.passports, [tripId]: { ...s.passports[tripId], [passport.cardId]: passport } } })),

      applyCloud: (tripId, kind, data, stamp) =>
        set((s) => {
          const stamps = { ...s.syncStamps, [`${tripId}:${kind}`]: stamp }
          const put = <T,>(rec: Record<string, T>) => ({ ...rec, [tripId]: data as T })
          switch (kind) {
            case 'notes': return { syncStamps: stamps, notes: put(s.notes) }
            case 'budget': return { syncStamps: stamps, budgets: put(s.budgets) }
            case 'itinerary': return { syncStamps: stamps, itineraries: put(s.itineraries) }
            case 'packing': return { syncStamps: stamps, packingLists: put(s.packingLists) }
            case 'brief': return { syncStamps: stamps, briefs: put(s.briefs) }
            case 'reality': return { syncStamps: stamps, realityChecks: put(s.realityChecks) }
            case 'marks': return { syncStamps: stamps, realityMarks: put(s.realityMarks) }
            case 'passports': return { syncStamps: stamps, passports: put(s.passports) }
            case 'settings':
              return {
                syncStamps: stamps,
                trips: s.trips.map((t) => (t.id === tripId ? { ...t, ...(data as TripSettings) } : t)),
              }
            case 'positions': {
              const pos = data as Record<string, TravelCard['pinPosition']>
              return {
                syncStamps: stamps,
                cards: { ...s.cards, [tripId]: (s.cards[tripId] ?? []).map((c) => (pos[c.id] ? { ...c, pinPosition: pos[c.id] } : c)) },
              }
            }
          }
        }),

      setSyncStamp: (key, stamp) => set((s) => ({ syncStamps: { ...s.syncStamps, [key]: stamp } })),

      getTrip: (tripId) => get().trips.find((t) => t.id === tripId) ?? null,

      resetSetup: () => set({ activeSetup: { ...DEFAULT_SETUP } }),
    }),
    {
      name: 'travelclick-store',
      version: 1,
      // v0 stored absolute corkboard coordinates; the collage board stores a
      // drag *offset* per card, so old positions must reset or cards fly off.
      migrate: (persisted, version) => {
        const state = persisted as Partial<TripStore>
        if (version < 1 && state?.cards) {
          const cards: Record<string, TravelCard[]> = {}
          for (const [tripId, list] of Object.entries(state.cards)) {
            cards[tripId] = list.map((c) => ({
              ...c,
              pinPosition: { x: 0, y: 0, rotation: randomInRange(-2.5, 3) },
            }))
          }
          state.cards = cards
        }
        return state as TripStore
      },
    }
  )
)
