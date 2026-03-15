-- ============================================================================
-- Media Guard: Content deduplication & versioning via pgvector
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. media_assets table
-- --------------------------------------------------------------------------
create table public.media_assets (
  id                uuid primary key default gen_random_uuid(),
  sha256_hash       text             not null unique,
  media_type        public.media_type not null default 'image',
  p_hash            text,                            -- perceptual hash (images)
  audio_fingerprint text,                            -- Chromaprint raw (audio)
  vibe_vector       vector(768),                     -- DINOv2 semantic embedding
  parent_id         uuid             references public.media_assets(id) on delete set null,
  created_by        uuid             references public.profiles(id) on delete set null,
  metadata          jsonb            not null default '{}',
  created_at        timestamptz      not null default now()
);

comment on table  public.media_assets is 'Media Guard: deduplication + version tracking for images and audio.';
comment on column public.media_assets.sha256_hash is 'SHA-256 hex digest — exact binary match key.';
comment on column public.media_assets.vibe_vector is 'DINOv2 vits14 768-dim embedding for semantic similarity.';
comment on column public.media_assets.parent_id is 'Points to the origin asset if this is a derivative (crop, remix, etc.).';

-- Indexes
create index idx_media_assets_created_by   on public.media_assets(created_by);
create index idx_media_assets_media_type   on public.media_assets(media_type);
create index idx_media_assets_parent       on public.media_assets(parent_id);
create index idx_media_assets_vibe_vector  on public.media_assets
  using hnsw (vibe_vector vector_cosine_ops);

-- --------------------------------------------------------------------------
-- 2. RPC: search_similar_media
-- --------------------------------------------------------------------------
create or replace function public.search_similar_media(
  query_vector  vector(768),
  threshold     float default 0.2,
  result_limit  int   default 5
)
returns table (
  id              uuid,
  sha256_hash     text,
  media_type      public.media_type,
  p_hash          text,
  parent_id       uuid,
  metadata        jsonb,
  created_at      timestamptz,
  distance        float
)
language sql
stable
as $$
  select
    ma.id,
    ma.sha256_hash,
    ma.media_type,
    ma.p_hash,
    ma.parent_id,
    ma.metadata,
    ma.created_at,
    (ma.vibe_vector <=> query_vector)::float as distance
  from public.media_assets ma
  where ma.vibe_vector is not null
    and (ma.vibe_vector <=> query_vector) < threshold
  order by ma.vibe_vector <=> query_vector
  limit result_limit;
$$;

-- --------------------------------------------------------------------------
-- 3. RPC: get_version_tree
-- --------------------------------------------------------------------------
create or replace function public.get_version_tree(target_parent_id uuid)
returns setof public.media_assets
language sql
stable
as $$
  select *
  from public.media_assets
  where parent_id = target_parent_id
  order by created_at asc;
$$;

-- --------------------------------------------------------------------------
-- 4. Row Level Security
-- --------------------------------------------------------------------------
alter table public.media_assets enable row level security;

create policy "Media assets are viewable by everyone"
  on public.media_assets for select
  using (true);

create policy "Authenticated users can insert media assets"
  on public.media_assets for insert
  with check (auth.uid() is not null);

create policy "Users can update own media assets"
  on public.media_assets for update
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

create policy "Users can delete own media assets"
  on public.media_assets for delete
  using (auth.uid() = created_by);
