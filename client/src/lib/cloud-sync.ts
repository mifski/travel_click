'use client'

import { useTripStore, SYNC_KINDS, type SyncKind, type TripSettings } from './store'
import { DEMO_TRIP_ID } from './demo-data'
import type { DbTripData } from './supabase'

/**
 * Syncs everything a trip holds beyond its pins (notes, budget + flights,
 * itinerary, packing, brief, Reality Check, passports, plan settings, pin
 * positions) to the trip_data table, one JSON row per trip and kind.
 * Newest change wins, judged by syncStamps; pulls on sign-in and whenever the
 * tab comes back into view, pushes ~1s after a local change.
 */

type State = ReturnType<typeof useTripStore.getState>
type Source = { ref: unknown; value: () => unknown }

const PUSH_DELAY = 1200

function plain(v: unknown): Source {
  return { ref: v, value: () => v }
}

/** What a kind syncs, plus the store reference that changes whenever it does */
function source(s: State, tripId: string, kind: SyncKind): Source {
  switch (kind) {
    case 'notes': return plain(s.notes[tripId])
    case 'budget': return plain(s.budgets[tripId])
    case 'itinerary': return plain(s.itineraries[tripId])
    case 'packing': return plain(s.packingLists[tripId])
    case 'brief': return plain(s.briefs[tripId])
    case 'reality': return plain(s.realityChecks[tripId])
    case 'marks': return plain(s.realityMarks[tripId])
    case 'passports': return plain(s.passports[tripId])
    case 'settings': {
      const t = s.trips.find((x) => x.id === tripId)
      return {
        ref: t,
        value: () => {
          if (!t) return undefined
          const v: TripSettings = { pace: t.pace, dayStart: t.dayStart, discovery: t.discovery, homeBase: t.homeBase }
          return Object.values(v).every((x) => x === undefined) ? undefined : v
        },
      }
    }
    case 'positions': {
      const cards = s.cards[tripId]
      return { ref: cards, value: () => (cards?.length ? Object.fromEntries(cards.map((c) => [c.id, c.pinPosition])) : undefined) }
    }
  }
}

const syncedTrips = (s: State) => s.trips.map((t) => t.id).filter((id) => id !== DEMO_TRIP_ID)
const keyOf = (tripId: string, kind: SyncKind) => `${tripId}:${kind}`

let userId: string | null = null
let unsubscribe: (() => void) | null = null
let applying = false
const seen = new Map<string, unknown>()
const timers = new Map<string, ReturnType<typeof setTimeout>>()

function snapshot() {
  const s = useTripStore.getState()
  for (const tripId of syncedTrips(s)) {
    for (const kind of SYNC_KINDS) seen.set(keyOf(tripId, kind), source(s, tripId, kind).ref)
  }
}

async function push(tripId: string, kind: SyncKind) {
  if (!userId) return
  const value = source(useTripStore.getState(), tripId, kind).value()
  if (value === undefined) return
  const stamp = new Date().toISOString()
  useTripStore.getState().setSyncStamp(keyOf(tripId, kind), stamp)
  try {
    const { saveTripData } = await import('./supabase')
    const { error } = await saveTripData({ trip_id: tripId, user_id: userId, kind, data: value, updated_at: stamp })
    if (error) console.warn(`Cloud sync skipped ${kind}:`, error.message)
  } catch { /* offline: the next change or sign-in pushes it */ }
}

function schedule(tripId: string, kind: SyncKind) {
  const key = keyOf(tripId, kind)
  clearTimeout(timers.get(key))
  timers.set(key, setTimeout(() => { timers.delete(key); void push(tripId, kind) }, PUSH_DELAY))
}

/** Pull every trip_data row; apply the newer side, push where local is newer */
async function pull() {
  if (!userId) return
  const { getTripData } = await import('./supabase')
  const s = useTripStore.getState()
  const tripIds = syncedTrips(s)
  if (!tripIds.length) return
  const { data, error } = await getTripData(tripIds)
  if (error) { console.warn('Cloud sync unavailable:', error.message); return }

  const rows = new Map((data as DbTripData[]).map((r) => [`${r.trip_id}:${r.kind}`, r]))
  const toPush: [string, SyncKind][] = []
  applying = true
  try {
    for (const tripId of tripIds) {
      for (const kind of SYNC_KINDS) {
        const key = keyOf(tripId, kind)
        const row = rows.get(key)
        const local = useTripStore.getState().syncStamps[key]
        if (row && (!local || row.updated_at > local)) {
          useTripStore.getState().applyCloud(tripId, kind, row.data, row.updated_at)
        } else if (source(useTripStore.getState(), tripId, kind).value() !== undefined && (!row || (local && local > row.updated_at))) {
          toPush.push([tripId, kind])
        }
      }
    }
  } finally {
    applying = false
  }
  snapshot()
  for (const [tripId, kind] of toPush) void push(tripId, kind)
}

function onVisible() {
  if (document.visibilityState === 'visible') void pull()
}

export async function startCloudSync(uid: string) {
  stopCloudSync()
  const sb = await import('./supabase')
  if (!sb.isSupabaseReady) return
  userId = uid

  // Trips and pins first, so settings and pin positions have something to land on
  try {
    const { data: trips } = await sb.getUserTrips(uid)
    if (userId !== uid) return
    if (trips?.length) {
      const store = useTripStore.getState()
      store.hydrateTrips(trips.map(sb.dbTripToTripContext))
      await Promise.all(trips.map(async (t) => {
        const { data } = await sb.getTripCards(t.id)
        if (data?.length) useTripStore.getState().hydrateCards(t.id, data.map(sb.dbCardToTravelCard))
      }))
    }
    await pull()
  } catch { /* offline: local store stays the source of truth */ }
  if (userId !== uid) return

  snapshot()
  unsubscribe = useTripStore.subscribe((s) => {
    if (applying) return
    for (const tripId of syncedTrips(s)) {
      for (const kind of SYNC_KINDS) {
        const key = keyOf(tripId, kind)
        const { ref } = source(s, tripId, kind)
        if (ref === seen.get(key)) continue
        seen.set(key, ref)
        if (ref !== undefined) schedule(tripId, kind)
      }
    }
  })
  document.addEventListener('visibilitychange', onVisible)
}

export function stopCloudSync() {
  userId = null
  unsubscribe?.()
  unsubscribe = null
  for (const t of timers.values()) clearTimeout(t)
  timers.clear()
  seen.clear()
  if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisible)
}
