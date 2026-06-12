-- Run this in your Supabase SQL editor at: Project Settings > SQL Editor
-- https://supabase.com/dashboard/project/YOUR_PROJECT/sql

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username     TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  birthday     DATE,
  gender       TEXT CHECK (gender IN ('man', 'woman', 'nonbinary', 'other', 'prefer_not')),
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Trips table
CREATE TABLE IF NOT EXISTS public.trips (
  id           TEXT PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  destination  TEXT NOT NULL DEFAULT '',
  country      TEXT DEFAULT '',
  start_date   DATE,
  end_date     DATE,
  pax_count    INTEGER DEFAULT 2,
  age_ranges   TEXT[] DEFAULT '{}',
  objectives   TEXT[] DEFAULT '{}',
  price_range  TEXT DEFAULT 'mid',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Cards table
CREATE TABLE IF NOT EXISTS public.cards (
  id           TEXT PRIMARY KEY,
  trip_id      TEXT NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source       TEXT DEFAULT 'manual',
  title        TEXT DEFAULT '',
  description  TEXT DEFAULT '',
  location_data JSONB DEFAULT '{}',
  image_url    TEXT,
  thumbnail_url TEXT,
  tags         TEXT[] DEFAULT '{}',
  confidence   TEXT,
  source_url   TEXT,
  creator      TEXT,
  pin_position JSONB DEFAULT '{"x":100,"y":100,"rotation":0}',
  saved_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own profile"   ON public.profiles FOR SELECT  USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT  WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE  USING (auth.uid() = id);

CREATE POLICY "Users manage own trips"   ON public.trips FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own cards"   ON public.cards FOR ALL USING (auth.uid() = user_id);

-- Avatar storage bucket (run separately if SQL editor complains about storage schema)
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatars are public"        ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users upload own avatar"   ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own avatar"   ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
