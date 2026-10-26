'use client'

import { useTripStore, SYNC_KINDS, type SyncKind, type TripSettings } from './store'
import { DEMO_TRIP_ID } from './demo-data'
import type { DbTripData, DbCard } from './supabase'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

/**
 * Syncs everything a trip holds beyond its pins (notes, budget + flights,
 * itinerary, packing, brief, Reality Check, passports, plan settings, pin
 * positions) to the trip_data table, one JSON row per trip and kind.
 * Newest change wins, judged by syncStamps; pulls on sign-in and whenever the
 * tab comes back into view, pushes ~1s after a local change. Shared boards get
 * collaborators' changes live over Supabase Realtime.
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
let channel: RealtimeChannel | null = null
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

/** Apply a remote change without the store subscription echoing it back as a push */
function applyQuietly(fn: () => void) {
  applying = true
  try { fn() } finally { applying = false }
  snapshot()
}

/** Trips (owned and shared), then their pins, then trip data, so settings and positions have something to land on */
async function loadAll(uid: string) {
  const sb = await import('./supabase')
  try {
    const { data: trips } = await sb.getUserTrips()
    if (userId !== uid) return
    if (trips?.length) {
      applyQuietly(() => useTripStore.getState().hydrateTrips(trips.map(sb.dbTripToTripContext)))
      const cardSets = await Promise.all(trips.map(async (t) => [t.id, (await sb.getTripCards(t.id)).data ?? []] as const))
      if (userId !== uid) return
      applyQuietly(() => {
        for (const [tripId, rows] of cardSets) {
          if (rows.length) useTripStore.getState().hydrateCards(tripId, rows.map(sb.dbCardToTravelCard))
        }
      })
    }
    await pull()
  } catch { /* offline: local store stays the source of truth */ }
}

function onVisible() {
  if (document.visibilityState === 'visible' && userId) void loadAll(userId)
}

async function onCardChange(payload: RealtimePostgresChangesPayload<DbCard>) {
  const { dbCardToTravelCard } = await import('./supabase')
  applyQuietly(() => {
    const store = useTripStore.getState()
    if (payload.eventType === 'DELETE') {
      const old = payload.old as Partial<DbCard>
      if (old.trip_id && old.id) store.dropCardLocal(old.trip_id, old.id)
    } else if (store.trips.some((t) => t.id === payload.new.trip_id)) {
      store.upsertCardLocal(dbCardToTravelCard(payload.new))
    }
  })
}

function onDataChange(payload: RealtimePostgresChangesPayload<DbTripData>) {
  if (payload.eventType === 'DELETE') return
  const row = payload.new
  const kind = SYNC_KINDS.find((k) => k === row.kind)
  const store = useTripStore.getState()
  if (!kind || !store.trips.some((t) => t.id === row.trip_id)) return
  const local = store.syncStamps[keyOf(row.trip_id, kind)]
  if (local && row.updated_at <= local) return // our own echo, or older than what we have
  clearTimeout(timers.get(keyOf(row.trip_id, kind)))
  applyQuietly(() => useTripStore.getState().applyCloud(row.trip_id, kind, row.data, row.updated_at))
}

export async function startCloudSync(uid: string) {
  stopCloudSync()
  const sb = await import('./supabase')
  if (!sb.isSupabaseReady) return
  userId = uid

  await loadAll(uid)
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

  // RLS limits these streams to boards this account owns or was added to
  channel = sb.supabase
    .channel(`tc-sync-${uid}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'cards' }, (p) => void onCardChange(p as RealtimePostgresChangesPayload<DbCard>))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'trip_data' }, (p) => onDataChange(p as RealtimePostgresChangesPayload<DbTripData>))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'trip_members' }, () => { if (userId) void loadAll(userId) })
    .subscribe()
}

export function stopCloudSync() {
  userId = null
  unsubscribe?.()
  unsubscribe = null
  const ch = channel
  channel = null
  if (ch) void import('./supabase').then(({ supabase }) => supabase.removeChannel(ch))
  for (const t of timers.values()) clearTimeout(t)
  timers.clear()
  seen.clear()
  if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisible)
}
