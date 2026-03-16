-- ============================================================================
-- Media Guard: Dispute & Claim System
-- ============================================================================

-- 1. disputes table
-- Allows creators to flag incorrect matches or claim ownership of derivatives.
create table public.disputes (
  id                uuid primary key default gen_random_uuid(),
  asset_id          uuid not null references public.media_assets(id) on delete cascade,
  creator_id        uuid not null references public.profiles(id) on delete cascade,
  dispute_type      text not null default 'incorrect_match', -- 'incorrect_match', 'rightful_owner', 'unauthorized_use'
  status            text not null default 'open', -- 'open', 'resolved', 'closed'
  reason            text not null,
  metadata          jsonb not null default '{}',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table public.disputes is 'Media Guard: system for capturing and resolving content flags.';

-- Indexes
create index idx_disputes_asset on public.disputes(asset_id);
create index idx_disputes_creator on public.disputes(creator_id);
create index idx_disputes_status on public.disputes(status);

-- RLS
alter table public.disputes enable row level security;

create policy "Disputes are viewable by creators involved"
  on public.disputes for select
  using (
    auth.uid() = creator_id or 
    exists (
      select 1 from public.media_assets 
      where id = asset_id and created_by = auth.uid()
    )
  );

create policy "Users can open disputes"
  on public.disputes for insert
  with check (auth.uid() = creator_id);

create policy "System can update disputes"
  on public.disputes for update
  using (auth.uid() = creator_id or exists (
      select 1 from public.media_assets 
      where id = asset_id and created_by = auth.uid()
    ));

-- Trigger for updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tr_disputes_updated_at
  before update on public.disputes
  for each row
  execute function public.handle_updated_at();
