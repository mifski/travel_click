-- Cross-device sync for everything a trip holds beyond its pins:
-- notes, budget + flights, itinerary, packing, brief, Reality Check,
-- pin passports, plan settings and pin positions (one JSON row per kind).
-- Run once in Supabase → SQL Editor. Safe to re-run.

CREATE TABLE IF NOT EXISTS public.trip_data (
  trip_id    TEXT NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL,
  data       JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (trip_id, kind)
);

ALTER TABLE public.trip_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own trip data" ON public.trip_data;
CREATE POLICY "Users manage own trip data" ON public.trip_data
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
