-- ============================================================================
-- Ad push v2 — SIMPLIFIED
-- (replaces the 20260827010000 ad-push system and the Postgres side of the
--  auto-release cron)
--
-- The new model (this is all there is):
--   * Each advertisement has a push_sent_at flag (NULL = not pushed yet)
--     and a push_users counter.
--   * Supabase SCHEDULES the send-ad-notification edge function with its
--     built-in scheduler (--cron at deploy). No Postgres cron, no pg_net,
--     no shared secrets, nothing to copy anywhere.
--   * The flag is set before sending, so an ad is pushed exactly once.
--
-- What this file does (every step is guarded — safe to run whether or not
-- you ran the old migrations):
--   1. Adds push_sent_at + push_users to advertisements.
--   2. Un-schedules and drops the old orchestration:
--        - eden-queue-ad-pushes cron job, queue_ad_pushes(), claim_ad_push(),
--          ad_push_log table
--        - eden-auto-release-escrow cron job, trigger_auto_release()
--   3. Drops the ef_secrets table (nothing uses it anymore).
--
-- AFTER running this, the ENTIRE setup is:
--   supabase functions deploy send-ad-notification --no-verify-jwt --cron "*/15 * * * *"
--   supabase functions deploy auto-release-escrow  --no-verify-jwt --cron "*/15 * * * *"
--   Set env EXPO_PUSH_ACCESS_TOKEN on the first, PAYSTACK_SECRET_KEY on the
--   second. Done.
--
-- NOTE on existing ads: active ads created before this flag existed have
-- push_sent_at = NULL, so the scheduled function will push them one per
-- 15 minutes (catching up on anything the old broken system never sent).
-- If you do NOT want your existing ads pushed, run this instead:
--   update public.advertisements set push_sent_at = now() where push_sent_at is null;
-- ============================================================================

alter table public.advertisements add column if not exists push_sent_at timestamptz;
alter table public.advertisements add column if not exists push_users integer not null default 0;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'eden-queue-ad-pushes') then
      perform cron.unschedule('eden-queue-ad-pushes');
    end if;
    if exists (select 1 from cron.job where jobname = 'eden-auto-release-escrow') then
      perform cron.unschedule('eden-auto-release-escrow');
    end if;
  end if;
end;
$$;

drop function if exists public.queue_ad_pushes(integer);
drop function if exists public.claim_ad_push(uuid);
drop function if exists public.trigger_auto_release();
drop table if exists public.ad_push_log;
drop table if exists public.ef_secrets;
