-- ============================================================================
-- Media Guard: Attribution & Revenue Share System
-- ============================================================================

-- 1. attributions table
-- Tracks formal links between original works and derivatives/remixes.
create table public.attributions (
  id                uuid primary key default gen_random_uuid(),
  original_asset_id uuid not null references public.media_assets(id) on delete cascade,
  derivative_asset_id uuid not null references public.media_assets(id) on delete cascade,
  original_owner_id uuid not null references public.profiles(id) on delete cascade,
  derivative_owner_id uuid not null references public.profiles(id) on delete cascade,
  attribution_type  text not null default 'remix', -- 'remix', 'sample', 'crop', 'collaboration'
  status            text not null default 'pending', -- 'pending', 'verified', 'disputed'
  metadata          jsonb not null default '{}',
  created_at        timestamptz not null default now(),
  
  unique(original_asset_id, derivative_asset_id)
);

comment on table public.attributions is 'Media Guard: formal attribution links between creators.';

-- Indexes
create index idx_attributions_original_owner on public.attributions(original_owner_id);
create index idx_attributions_derivative_owner on public.attributions(derivative_owner_id);
create index idx_attributions_original_asset on public.attributions(original_asset_id);

-- RLS
alter table public.attributions enable row level security;

create policy "Attributions are viewable by everyone"
  on public.attributions for select
  using (true);

create policy "System can insert attributions"
  on public.attributions for insert
  with check (auth.uid() is not null);

create policy "Owners can update status"
  on public.attributions for update
  using (auth.uid() = original_owner_id or auth.uid() = derivative_owner_id);

-- 2. Function to auto-create attribution on similarity match
create or replace function public.handle_similarity_attribution()
returns trigger
language plpgsql
security definer
as $$
declare
    v_parent_owner_id uuid;
begin
    if NEW.parent_id is not null then
        -- Find parent owner
        select created_by into v_parent_owner_id
        from public.media_assets
        where id = NEW.parent_id;
        
        -- If parent has owner and it's not the same as newcomer
        if v_parent_owner_id is not null and v_parent_owner_id != NEW.created_by then
            insert into public.attributions (
                original_asset_id,
                derivative_asset_id,
                original_owner_id,
                derivative_owner_id,
                attribution_type
            ) values (
                NEW.parent_id,
                NEW.id,
                v_parent_owner_id,
                NEW.created_by,
                'remix' -- default, can be updated by guard logic later if needed
            )
            on conflict (original_asset_id, derivative_asset_id) do nothing;
        end if;
    end if;
    return NEW;
end;
$$;

-- Trigger
create trigger tr_media_assets_attribution
  after insert on public.media_assets
  for each row
  execute function public.handle_similarity_attribution();
