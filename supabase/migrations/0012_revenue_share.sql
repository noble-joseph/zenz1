-- ============================================================================
-- Media Guard: Revenue Share System (Placeholder)
-- ============================================================================

-- Add revenue_share_percent to attributions
alter table public.attributions 
add column revenue_share_percent numeric(5,2) default 0.00;

comment on column public.attributions.revenue_share_percent is 'Placeholder for automated royalty or revenue splits between creators.';

-- Update existing remixes to have a default 10% share (placeholder logic)
update public.attributions 
set revenue_share_percent = 10.00 
where attribution_type = 'remix';
