-- ============================================================================

CREATE SCHEMA IF NOT EXISTS public;

-- --------------------------------------------------------------------------
-- 0. Extensions
-- --------------------------------------------------------------------------
create extension if not exists "pgcrypto";    -- gen_random_uuid()
create extension if not exists "vector";      -- pgvector for vibe search

-- --------------------------------------------------------------------------
-- 1. Custom Enum Types
-- --------------------------------------------------------------------------
create type public.user_role       as enum ('creator', 'hirer');
create type public.media_type      as enum ('image', 'video', 'audio', 'document', 'other');
create type public.collab_status   as enum ('pending', 'verified', 'rejected');

-- --------------------------------------------------------------------------
-- 2. profiles
-- --------------------------------------------------------------------------
create table public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  role             public.user_role    not null default 'creator',
  profession       text,               -- 'Cinematographer', 'Musician', etc.
  display_name     text,
  bio              text,
  avatar_url       text,
  public_slug      varchar(80) unique,
  specializations  text[]              not null default '{}',
  achievements     text[]              not null default '{}',
  influence_score  int                 not null default 0,
  created_at       timestamptz         not null default now(),
  updated_at       timestamptz         not null default now()
);

comment on table  public.profiles is 'Extended user profile linked 1-to-1 with auth.users.';
comment on column public.profiles.public_slug is 'URL-safe slug for the public portfolio route (/[slug]).';
comment on column public.profiles.influence_score is 'Derived from verified collaborations. Recalculated server-side.';

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- --------------------------------------------------------------------------
-- 3. assets (Content-Addressable Storage)
-- --------------------------------------------------------------------------
create table public.assets (
  hash_id      varchar(64)         primary key,  -- SHA-256 hex digest
  storage_url  text                not null,
  phash        varchar(64),                       -- perceptual hash for similarity
  media_type   public.media_type   not null default 'other',
  metadata     jsonb               not null default '{}',
  created_by   uuid                references public.profiles(id) on delete set null,
  created_at   timestamptz         not null default now()
);

comment on table  public.assets is 'Content-addressable asset store. PK is the SHA-256 of the binary.';
comment on column public.assets.phash is 'Perceptual hash for visual/audio similarity search.';
comment on column public.assets.metadata is 'Original filename, size, EXIF, dimensions, duration, etc.';

create index idx_assets_created_by on public.assets(created_by);
create index idx_assets_media_type on public.assets(media_type);

-- --------------------------------------------------------------------------
-- 4. projects
-- --------------------------------------------------------------------------
create table public.projects (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid                not null references public.profiles(id) on delete cascade,
  title        varchar(200)        not null,
  slug         varchar(200),
  description  text,
  is_public    boolean             not null default false,
  created_at   timestamptz         not null default now(),
  updated_at   timestamptz         not null default now(),
  unique(owner_id, slug)
);

comment on table public.projects is 'Top-level container for a creative work. Analogous to a Git repo.';

create index idx_projects_owner on public.projects(owner_id);

create trigger projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- --------------------------------------------------------------------------
-- 5. commits (Git-style versioning)
-- --------------------------------------------------------------------------
create table public.commits (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid            not null references public.projects(id) on delete cascade,
  asset_id        varchar(64)     not null references public.assets(hash_id) on delete restrict,
  parent_id       uuid            references public.commits(id) on delete set null,
  change_message  text            not null default '',
  metadata_diff   jsonb           not null default '{}',
  created_by      uuid            not null references public.profiles(id) on delete cascade,
  created_at      timestamptz     not null default now()
);

comment on table  public.commits is 'Immutable commit log. Each row is one versioned state change.';
comment on column public.commits.parent_id is 'NULL for root commits. Points to the previous commit for rollback.';
comment on column public.commits.metadata_diff is 'JSONB diff describing what changed in this commit.';

create index idx_commits_project    on public.commits(project_id);
create index idx_commits_asset      on public.commits(asset_id);
create index idx_commits_parent     on public.commits(parent_id);
create index idx_commits_created_by on public.commits(created_by);
create index idx_commits_created_at on public.commits(project_id, created_at desc);

-- --------------------------------------------------------------------------
-- 6. collaborations (Verified Credit System)
-- --------------------------------------------------------------------------
create table public.collaborations (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid                     not null references public.projects(id) on delete cascade,
  creator_id   uuid                     not null references public.profiles(id) on delete cascade,
  requested_by uuid                     not null references public.profiles(id) on delete cascade,
  role_title   varchar(100)             not null default 'collaborator',
  status       public.collab_status     not null default 'pending',
  created_at   timestamptz              not null default now(),
  updated_at   timestamptz              not null default now(),
  unique(project_id, creator_id)
);

comment on table  public.collaborations is 'Multi-sig credit system. Pending until the tagged creator accepts.';
comment on column public.collaborations.requested_by is 'The user who initiated the credit tag.';
comment on column public.collaborations.status is 'pending → verified (accepted) or rejected. Only verified counts toward influence_score.';

create index idx_collabs_project    on public.collaborations(project_id);
create index idx_collabs_creator    on public.collaborations(creator_id);
create index idx_collabs_status     on public.collaborations(status);

create trigger collaborations_updated_at
  before update on public.collaborations
  for each row execute function public.set_updated_at();

-- --------------------------------------------------------------------------
-- 7. Influence Score Recalculation
-- --------------------------------------------------------------------------
-- Recalculates influence_score = count of VERIFIED collaborations for a profile.
create or replace function public.recalc_influence_score(target_profile_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.profiles
  set influence_score = (
    select count(*)::int
    from public.collaborations
    where creator_id = target_profile_id
      and status = 'verified'
  )
  where id = target_profile_id;
end;
$$;

-- Trigger: auto-recalculate when a collaboration status changes
create or replace function public.on_collab_status_change()
returns trigger
language plpgsql
security definer
as $$
begin
  perform public.recalc_influence_score(new.creator_id);
  if old.creator_id <> new.creator_id then
    perform public.recalc_influence_score(old.creator_id);
  end if;
  return new;
end;
$$;

create trigger trg_collab_status_change
  after update of status on public.collaborations
  for each row execute function public.on_collab_status_change();

-- Also recalc on insert (new verified collab) and delete
create or replace function public.on_collab_insert()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.status = 'verified' then
    perform public.recalc_influence_score(new.creator_id);
  end if;
  return new;
end;
$$;

create trigger trg_collab_insert
  after insert on public.collaborations
  for each row execute function public.on_collab_insert();

create or replace function public.on_collab_delete()
returns trigger
language plpgsql
security definer
as $$
begin
  perform public.recalc_influence_score(old.creator_id);
  return old;
end;
$$;

create trigger trg_collab_delete
  after delete on public.collaborations
  for each row execute function public.on_collab_delete();

-- ============================================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- ---- profiles ----
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---- assets ----
alter table public.assets enable row level security;

create policy "Assets are viewable by everyone"
  on public.assets for select
  using (true);

create policy "Authenticated users can insert assets"
  on public.assets for insert
  with check (auth.uid() is not null);

-- ---- projects ----
alter table public.projects enable row level security;

create policy "Public projects are viewable by everyone"
  on public.projects for select
  using (is_public = true or auth.uid() = owner_id);

create policy "Owners can insert projects"
  on public.projects for insert
  with check (auth.uid() = owner_id);

create policy "Owners can update own projects"
  on public.projects for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Owners can delete own projects"
  on public.projects for delete
  using (auth.uid() = owner_id);

-- ---- commits ----
alter table public.commits enable row level security;

create policy "Commits on public projects are viewable by everyone"
  on public.commits for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id
        and (p.is_public = true or p.owner_id = auth.uid())
    )
  );

create policy "Project owners can insert commits"
  on public.commits for insert
  with check (
    auth.uid() = created_by
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  );

-- ---- collaborations ----
alter table public.collaborations enable row level security;

create policy "Collaborations on public projects are viewable by everyone"
  on public.collaborations for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id
        and (p.is_public = true or p.owner_id = auth.uid())
    )
    or creator_id = auth.uid()
  );

create policy "Project owners can insert collaborations"
  on public.collaborations for insert
  with check (
    auth.uid() = requested_by
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  );

create policy "Tagged creators can update their own collaboration status"
  on public.collaborations for update
  using (auth.uid() = creator_id)
  with check (auth.uid() = creator_id);

create policy "Project owners can delete collaborations"
  on public.collaborations for delete
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  );
