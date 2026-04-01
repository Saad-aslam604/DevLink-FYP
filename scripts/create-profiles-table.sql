-- SQL to create the `profiles` table for DevLink
-- Run this in the Supabase SQL editor (or via psql connected to your Supabase Postgres)

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  bio text,
  skills text[],
  experience_level text,
  job_title text,
  company text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for faster lookups by full_name
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON public.profiles (full_name);
