-- --------------------------------------------------------------------------
-- Talent OS — Phase 7 Connections & Private Access
-- Add connection system and update RLS for selective privacy
-- --------------------------------------------------------------------------

-- 1. Create connections table
create type public.connection_status as enum ('pending', 'accepted', 'rejected');

create table public.connections (
  id           uuid primary key default gen_random_uuid(),
  sender_id    uuid not null references public.profiles(id) on delete cascade,
  receiver_id  uuid not null references public.profiles(id) on delete cascade,
  status       public.connection_status not null default 'pending',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique(sender_id, receiver_id),
  check (sender_id <> receiver_id)
);

-- Index for fast lookup
create index idx_connections_sender on public.connections(sender_id);
create index idx_connections_receiver on public.connections(receiver_id);
create index idx_connections_status on public.connections(status);

-- 2. Helper function to check connection status
create or replace function public.is_connected(user_id_a uuid, user_id_b uuid)
returns boolean
language sql
security definer
as $$
  select exists (
    select 1 from public.connections
    where status = 'accepted'
    and (
      (sender_id = user_id_a and receiver_id = user_id_b)
      or (sender_id = user_id_b and receiver_id = user_id_a)
    )
  );
$$;

-- 3. Update Project RLS Policies
-- First drop the old ones
drop policy if exists "Public projects are viewable by everyone" on public.projects;

create policy "Projects are viewable by everyone if public or if connected"
  on public.projects for select
  using (
    is_public = true 
    or auth.uid() = owner_id
    or public.is_connected(owner_id, auth.uid())
  );

-- 4. Update Commits RLS Policies
drop policy if exists "Commits on public projects are viewable by everyone" on public.commits;

create policy "Commits on public/connected projects are viewable by everyone"
  on public.commits for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id
        and (p.is_public = true or p.owner_id = auth.uid() or public.is_connected(p.owner_id, auth.uid()))
    )
  );

-- 5. Create Messages table for creator-to-creator communication
create table public.messages (
  id           uuid primary key default gen_random_uuid(),
  sender_id    uuid not null references public.profiles(id) on delete cascade,
  receiver_id  uuid not null references public.profiles(id) on delete cascade,
  content      text not null,
  is_read      boolean not null default false,
  created_at   timestamptz not null default now()
);

alter table public.messages enable row level security;

create policy "Users can view messages they sent or received"
  on public.messages for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "Users can send messages"
  on public.messages for insert
  with check (auth.uid() = sender_id);

-- 6. Connections RLS
alter table public.connections enable row level security;

create policy "Users can view their own connections"
  on public.connections for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "Users can initiate connections"
  on public.connections for insert
  with check (auth.uid() = sender_id);

create policy "Users can update their own connection requests"
  on public.connections for update
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- Trigger for updated_at on connections
create trigger connections_updated_at
  before update on public.connections
  for each row execute function public.set_updated_at();
