-- Shared boards: add friends by username; they see and edit everything live.
-- Run once in Supabase → SQL Editor, after supabase-sync.sql. Safe to re-run.

-- Who besides the owner can open a trip
CREATE TABLE IF NOT EXISTS public.trip_members (
  trip_id    TEXT NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  added_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (trip_id, user_id)
);
ALTER TABLE public.trip_members ENABLE ROW LEVEL SECURITY;

-- Owner or member? SECURITY DEFINER so policies can call it without recursing through RLS
CREATE OR REPLACE FUNCTION public.can_access_trip(tid TEXT) RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM trips WHERE id = tid AND user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM trip_members WHERE trip_id = tid AND user_id = auth.uid());
$$;

DROP POLICY IF EXISTS "Members see trip members" ON public.trip_members;
CREATE POLICY "Members see trip members" ON public.trip_members
  FOR SELECT USING (public.can_access_trip(trip_id));
DROP POLICY IF EXISTS "Owner removes, members leave" ON public.trip_members;
CREATE POLICY "Owner removes, members leave" ON public.trip_members
  FOR DELETE USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.user_id = auth.uid()));

-- Trips: owners keep full control; members can open shared ones
DROP POLICY IF EXISTS "Users manage own trips" ON public.trips;
DROP POLICY IF EXISTS "Owners manage trips" ON public.trips;
CREATE POLICY "Owners manage trips" ON public.trips
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Members view shared trips" ON public.trips;
CREATE POLICY "Members view shared trips" ON public.trips
  FOR SELECT USING (public.can_access_trip(id));

-- Pins and trip data: anyone on the trip can add, edit and remove
DROP POLICY IF EXISTS "Users manage own cards" ON public.cards;
DROP POLICY IF EXISTS "Collaborators manage cards" ON public.cards;
CREATE POLICY "Collaborators manage cards" ON public.cards
  FOR ALL USING (public.can_access_trip(trip_id))
  WITH CHECK (public.can_access_trip(trip_id) AND user_id = auth.uid());

DROP POLICY IF EXISTS "Users manage own trip data" ON public.trip_data;
DROP POLICY IF EXISTS "Collaborators manage trip data" ON public.trip_data;
CREATE POLICY "Collaborators manage trip data" ON public.trip_data
  FOR ALL USING (public.can_access_trip(trip_id))
  WITH CHECK (public.can_access_trip(trip_id) AND user_id = auth.uid());

-- Add a friend by username (profiles aren't readable across accounts, so this runs as definer)
CREATE OR REPLACE FUNCTION public.add_trip_member(tid TEXT, member_username TEXT) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target UUID;
BEGIN
  IF NOT public.can_access_trip(tid) THEN RAISE EXCEPTION 'You can only share your own boards'; END IF;
  SELECT p.id INTO target FROM profiles p WHERE lower(p.username) = lower(ltrim(trim(member_username), '@'));
  IF target IS NULL THEN RAISE EXCEPTION 'No TravelClick user called @%', ltrim(trim(member_username), '@'); END IF;
  IF EXISTS (SELECT 1 FROM trips t WHERE t.id = tid AND t.user_id = target) THEN RAISE EXCEPTION 'They already own this board'; END IF;
  INSERT INTO trip_members (trip_id, user_id, added_by) VALUES (tid, target, auth.uid()) ON CONFLICT DO NOTHING;
  RETURN (SELECT json_build_object('id', p.id, 'username', p.username, 'display_name', p.display_name, 'avatar_url', p.avatar_url, 'role', 'member')
          FROM profiles p WHERE p.id = target);
END $$;

-- Everyone on a board, owner first
CREATE OR REPLACE FUNCTION public.trip_people(tid TEXT) RETURNS JSON
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT CASE WHEN public.can_access_trip(tid) THEN (
    SELECT COALESCE(json_agg(x ORDER BY x.role DESC, x.username), '[]'::json) FROM (
      SELECT p.id, p.username, p.display_name, p.avatar_url, 'owner' AS role
        FROM trips t JOIN profiles p ON p.id = t.user_id WHERE t.id = tid
      UNION ALL
      SELECT p.id, p.username, p.display_name, p.avatar_url, 'member'
        FROM trip_members m JOIN profiles p ON p.id = m.user_id WHERE m.trip_id = tid
    ) x
  ) ELSE '[]'::json END;
$$;

-- Live updates: deletes carry the whole row so the trip filter can see them
ALTER TABLE public.cards REPLICA IDENTITY FULL;
ALTER TABLE public.trip_data REPLICA IDENTITY FULL;
ALTER TABLE public.trip_members REPLICA IDENTITY FULL;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.cards; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_data; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_members; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
