-- ============================================================================
-- 48-hour escrow auto-release (Trigger B from your terms & UI)
--
-- Every 15 minutes, if any escrow has passed its confirmation deadline and
-- the tenant has neither confirmed nor disputed, this pings the
-- `auto-release-escrow` edge function, which pays the landlord out via
-- Paystack and marks the rental released.
--
-- SAFETY:
--   * The edge function only claims rows atomically and skips anything that
--     your prod release flow touched in the last minutes — so if prod ALREADY
--     implements Trigger B, this job is a harmless no-op.
--   * One ping per run max (the function itself processes a bounded batch).
--
-- AFTER running this file:
--   1. supabase functions deploy auto-release-escrow --no-verify-jwt
--   2. Set env vars on it (dashboard -> Edge Functions -> auto-release-escrow
--      -> Manage secrets):
--        AUTO_RELEASE_SECRET = select value from public.ef_secrets
--                              where key = 'auto_release_secret';
--        PAYSTACK_SECRET_KEY = (same key your other Paystack functions use)
-- ============================================================================

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- Shared secret (same mechanism as the ad-push system; no pgjwt needed).
insert into public.ef_secrets (key, value)
values ('auto_release_secret', lower(md5(random()::text || now()::text || 'eden-auto-release')))
on conflict (key) do nothing;

create or replace function public.trigger_auto_release()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  secret text;
  has_due boolean;
begin
  -- Only ping the edge function when there is actually something due.
  select exists (
    select 1 from public.rentals
    where status in ('awaiting_confirmation', 'confirmed')
      and confirmation_deadline is not null
      and confirmation_deadline < now() - interval '10 minutes'
  ) into has_due;

  if not has_due then
    return;
  end if;

  select value into secret from public.ef_secrets where key = 'auto_release_secret';
  if secret is null then
    raise exception 'auto_release_secret missing from ef_secrets - re-run the migration';
  end if;

  -- Async: pg_net sends this in the background; the cron never blocks.
  perform net.http_post(
    url := 'https://ytpggbkndnynyzashexk.supabase.co/functions/v1/auto-release-escrow',
    headers := jsonb_build_object(
      'x-ef-secret', secret,
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
end;
$$;

revoke execute on function public.trigger_auto_release() from public, anon, authenticated;
grant execute on function public.trigger_auto_release() to postgres, service_role;

-- Cron: every 15 minutes, idempotent (safe to re-run this migration).
do $$
begin
  if exists (select 1 from cron.job where jobname = 'eden-auto-release-escrow') then
    perform cron.unschedule('eden-auto-release-escrow');
  end if;
  perform cron.schedule('eden-auto-release-escrow', '*/15 * * * *', 'select public.trigger_auto_release()');
end;
$$;
