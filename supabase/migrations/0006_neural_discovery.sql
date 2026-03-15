-- --------------------------------------------------------------------------
-- Talent OS — Phase 6 Neural Discovery
-- Add vector embeddings to profiles and creator-to-creator similarity
-- --------------------------------------------------------------------------

-- 1. Add vector column to profiles (768 dimensions for gemini-embedding-001)
alter table public.profiles
add column if not exists embedding vector(768);

-- 2. Add an index for faster similarity search
create index if not exists idx_profiles_embedding 
  on public.profiles 
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 10);

-- 3. Create RPC matching function for creators
-- Excludes the requester and already connected creators (collaborators)
create or replace function public.match_creators(
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  excluded_id uuid
)
returns table (
  id uuid,
  display_name text,
  public_slug varchar,
  bio text,
  avatar_url text,
  profession text,
  influence_score int,
  similarity float
)
language sql
security definer
as $$
  select 
    p.id,
    p.display_name,
    p.public_slug,
    p.bio,
    p.avatar_url,
    p.profession,
    p.influence_score,
    1 - (p.embedding <=> query_embedding) as similarity
  from public.profiles p
  where 1 - (p.embedding <=> query_embedding) > match_threshold
    and p.id != excluded_id
    and not exists (
      select 1 from public.collaborations c 
      where (c.creator_id = p.id and c.requested_by = excluded_id)
         or (c.requested_by = p.id and c.creator_id = excluded_id)
    )
  order by p.embedding <=> query_embedding
  limit match_count;
$$;
