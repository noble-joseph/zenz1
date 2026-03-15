-- --------------------------------------------------------------------------
-- Talent OS — Phase 4 AI Vibe Search
-- Add pgvector embeddings and similarity search capabilities
-- --------------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS public;

-- 1. Add vector column (768 dimensions for gemini-embedding-001)
alter table public.assets
add column if not exists embedding vector(768);

-- 2. Add an IVF-Flat index for faster approximate nearest neighbor (ANN) search
-- Note: 'lists' parameter should be scaled based on expected row count. 
-- Using 100 as a reasonable default for medium-scale portfolios.
create index if not exists idx_assets_embedding 
  on public.assets 
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- 3. Create RPC matching function
-- We return distinct assets (content-addressed) to avoid duplicates in search results
create or replace function public.search_assets(
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (
  hash_id varchar,
  storage_url text,
  media_type public.media_type,
  metadata jsonb,
  similarity float
)
language sql
security definer
as $$
  select 
    a.hash_id,
    a.storage_url,
    a.media_type,
    a.metadata,
    1 - (a.embedding <=> query_embedding) as similarity
  from public.assets a
  where 1 - (a.embedding <=> query_embedding) > match_threshold
  order by a.embedding <=> query_embedding
  limit match_count;
$$;
