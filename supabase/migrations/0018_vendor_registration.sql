-- Vendor Management (Admin Panel) — phase 2: registration wizard drafts.
--
-- The step-by-step "Add vendor" wizard auto-saves progress here so an operator
-- can leave and resume. A draft is deliberately NOT a half-built `restaurants`
-- row: the real restaurant + auth account are created only at the final Review
-- step, so an abandoned wizard leaves no orphan shop or login behind.
--
-- `data` is the whole form as JSON. The vendor's chosen password is never
-- written here — the wizard strips it before saving; it exists only in the
-- operator's browser until submit.

create table if not exists public.vendor_registration_drafts (
  id         uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles (id) on delete cascade,
  data       jsonb not null default '{}',
  step       smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vendor_registration_drafts_creator_idx
  on public.vendor_registration_drafts (created_by, updated_at desc);

alter table public.vendor_registration_drafts enable row level security;

-- Admin-only, both directions. Drafts are an operator tool; no customer, vendor
-- or driver ever reads or writes them.
drop policy if exists "vendor_drafts — admin all" on public.vendor_registration_drafts;
create policy "vendor_drafts — admin all" on public.vendor_registration_drafts for all
  using (public.is_admin())
  with check (public.is_admin());
