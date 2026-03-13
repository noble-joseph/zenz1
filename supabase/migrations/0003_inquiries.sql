-- ============================================================================
-- Talent OS — Phase 3 Inquiry Pipeline
-- ============================================================================

create table public.inquiries (
  id           uuid primary key default gen_random_uuid(),
  creator_id   uuid                not null references public.profiles(id) on delete cascade,
  hirer_name    text                not null,
  hirer_email   text                not null,
  message      text                not null,
  project_id   uuid                references public.projects(id) on delete set null,
  status       text                not null default 'new', -- 'new', 'read', 'archived'
  created_at   timestamptz         not null default now()
);

comment on table public.inquiries is 'Stores inquiries from prospective hirers to creators.';

-- ROW LEVEL SECURITY
alter table public.inquiries enable row level security;

-- Creators can see all inquiries sent to them
create policy "Creators can view their own inquiries"
  on public.inquiries for select
  using (auth.uid() = creator_id);

-- Anyone can send an inquiry (public view)
create policy "Anyone can insert inquiries"
  on public.inquiries for insert
  with check (true);

-- Creators can delete their own inquiries
create policy "Creators can delete their own inquiries"
  on public.inquiries for delete
  using (auth.uid() = creator_id);
