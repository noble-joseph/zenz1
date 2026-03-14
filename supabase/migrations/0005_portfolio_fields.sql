-- ============================================================================
-- Talent OS — Phase 3: Full Creator Portfolio Fields
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Extend profiles with portfolio data
-- --------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cover_url           text,
  ADD COLUMN IF NOT EXISTS phone               text,
  ADD COLUMN IF NOT EXISTS location            text,
  ADD COLUMN IF NOT EXISTS website_url         text,
  ADD COLUMN IF NOT EXISTS social_links        jsonb  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS experience          jsonb  NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS equipment           text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS languages           text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS availability_status text   NOT NULL DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS portfolio_order     jsonb  NOT NULL DEFAULT '{"sections":["hero","about","social","experience","projects","credits","contact"],"pinnedProjects":[]}';

COMMENT ON COLUMN public.profiles.cover_url           IS 'URL for the portfolio hero/cover banner image.';
COMMENT ON COLUMN public.profiles.phone               IS 'Contact phone number (visible on public profile if set).';
COMMENT ON COLUMN public.profiles.location            IS 'City, Country — displayed on the profile.';
COMMENT ON COLUMN public.profiles.website_url         IS 'Primary personal website URL.';
COMMENT ON COLUMN public.profiles.social_links        IS 'JSONB map of social platform handles, e.g. { "instagram": "...", "youtube": "...", "spotify": "..." }.';
COMMENT ON COLUMN public.profiles.experience          IS 'JSONB array of experience entries: [{ title, company, start_date, end_date, description, current }].';
COMMENT ON COLUMN public.profiles.equipment           IS 'Array of gear/equipment the creator uses (e.g. RED Komodo, Neumann U87).';
COMMENT ON COLUMN public.profiles.languages           IS 'Languages the creator speaks.';
COMMENT ON COLUMN public.profiles.availability_status IS 'Availability for hire: available, busy, not_available.';
COMMENT ON COLUMN public.profiles.portfolio_order     IS 'Section ordering + pinned project IDs for the public portfolio layout.';

-- --------------------------------------------------------------------------
-- 2. Extend projects with per-project metadata
-- --------------------------------------------------------------------------

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS cover_url          text,
  ADD COLUMN IF NOT EXISTS client             text,
  ADD COLUMN IF NOT EXISTS role               text,
  ADD COLUMN IF NOT EXISTS thumbnail_asset_id varchar(64) REFERENCES public.assets(hash_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS equipment          text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.projects.cover_url          IS 'Cover/banner image URL for the project detail page.';
COMMENT ON COLUMN public.projects.client             IS 'Client or production company name.';
COMMENT ON COLUMN public.projects.role               IS 'Creator role on this project (e.g. Director of Photography).';
COMMENT ON COLUMN public.projects.thumbnail_asset_id IS 'SHA-256 hash of the asset used as project thumbnail.';
COMMENT ON COLUMN public.projects.equipment          IS 'Gear/equipment used specifically for this project.';
