-- =============================================================
-- Eden — Inspection booking passes (3-pack, direct Paystack)
--
-- Model (store-compliant, no virtual wallet):
--   A tenant buys a FIXED pack of 3 inspection bookings in naira
--   (one-time purchase via Paystack, verified server-side). Each
--   pass is consumed by booking ONE real-world property viewing.
--   There is no free-floating credit balance.
--
-- HOW TO RUN: paste this whole file into the Supabase SQL Editor
-- and Run.
-- =============================================================

create table public.inspection_passes (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  -- Reference of the Paystack pack purchase that created this pass
  paystack_reference text,
  -- The inspection booking that consumed this pass (null = unused)
  booking_id uuid,
  -- When the pass was consumed (null = unused)
  used_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  constraint inspection_passes_pkey primary key (id)
);

create index inspection_passes_user_idx
  on public.inspection_passes (user_id, used_at);
create index inspection_passes_reference_idx
  on public.inspection_passes (paystack_reference);

-- RLS: users can only SEE their own passes.
-- Insert/update happens ONLY via the service-role edge functions
-- (verify-inspection-pack, book-inspection).
alter table public.inspection_passes enable row level security;

drop policy if exists "Users can view own inspection passes" on public.inspection_passes;
create policy "Users can view own inspection passes"
  on public.inspection_passes
  for select
  using (auth.uid() = user_id);
