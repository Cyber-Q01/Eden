-- 20260828010000_payout_active_unique.sql
--
-- HARD double-payment guard for release-payment.
--
-- At most ONE active (pending or success) payout per rental. If two
-- requests race (double-tap on Confirm, network retry), the second
-- INSERT violates this index and the function aborts — no second
-- transfer is ever initiated.
--
-- 'failed' rows are intentionally excluded so a failed attempt can be
-- retried, and retry history (multiple failed rows) still works.
--
-- Safe to run repeatedly.

create unique index if not exists payouts_one_active_per_rental
    on public.payouts (rental_id)
    where status in ('pending', 'success');

-- If the statement above FAILS, you already have a rental with two
-- active payouts (dirty data). Find them with:
--   select rental_id, id, status, transfer_reference, created_at
--   from public.payouts
--   where status in ('pending','success')
--   group by rental_id having count(*) > 1;
-- Resolve each (check the Transfer in the Paystack dashboard), then re-run.
