-- Payout recipients: bank_accounts (one row per user) becomes the source of truth.
-- release-payment now reads bank_accounts.paystack_recipient_code first, with
-- payment_accounts only as a legacy fallback. The bank-details EF now writes the
-- recipient code onto the user's bank_accounts row on every save.
--
-- Run in SQL Editor after redeploying bank-details + release-payment.

-- 0. Diagnose first (optional — run these in a separate tab):
--    select user_id, count(*) from public.bank_accounts group by user_id having count(*) > 1;
--    select user_id, paystack_recipient_code from public.payment_accounts
--      where paystack_recipient_code is not null;
--    select r.id, r.status, r.paystack_reference, r.confirmation_deadline,
--           u.first_name || ' ' || u.last_name as renter
--      from public.rentals r join public.users u on u.id = r.renter_id
--     where r.status = 'confirmed';

-- 1. Backfill: copy recipient codes that only exist in payment_accounts
--    onto the user's bank_accounts row (so release-payment finds them).
update public.bank_accounts ba
set paystack_recipient_code = pa.paystack_recipient_code,
    updated_at = now()
from public.payment_accounts pa
where pa.user_id = ba.user_id
  and pa.paystack_recipient_code is not null
  and (ba.paystack_recipient_code is null or ba.paystack_recipient_code = '');

-- 2. Defensive: guarantee ONE bank_accounts row per user.
--    The repo schema already has UNIQUE(user_id); if prod drifted, this
--    de-duplicates (keeps the row with a recipient code, else the newest)
--    and adds the constraint. No-ops if the constraint already exists.
do $$
begin
  with ranked as (
    select id,
           row_number() over (
             partition by user_id
             order by (paystack_recipient_code is not null) desc,
                      updated_at desc nulls last,
                      created_at desc
           ) as rn
    from public.bank_accounts
  )
  delete from public.bank_accounts using ranked
  where bank_accounts.id = ranked.id and ranked.rn > 1;

  alter table public.bank_accounts
    add constraint bank_accounts_one_row_per_user unique (user_id);
exception
  when duplicate_table then
    null; -- unique already exists under any name — nothing to do
end $$;

-- 3. Unstick rentals that the old failed-release fallback marked 'confirmed'
--    (no payout was made for those). Flipping them back to
--    awaiting_confirmation lets the tenant re-tap "Release escrow" (or the
--    auto-release cron picks them up at the deadline).
--    release-payment's double-payment guard makes a re-release safe.
update public.rentals
set status = 'awaiting_confirmation',
    updated_at = now()
where status = 'confirmed';
