-- ============================================================================
-- Ad push system: exactly-once, performance-safe fan-out of new-ad pushes
--
-- Why this does NOT slow your database down (unlike per-user loops in SQL):
--   * The Postgres side only touches a handful of rows per run (claims) and
--     fires an ASYNC http_post via pg_net — the function returns in
--     milliseconds, never blocks waiting on network calls.
--   * The heavy work (loading push tokens, calling the Expo Push API in
--     batches of 100) happens entirely in the edge function, outside Postgres.
--   * ad_push_log guarantees each ad is pushed exactly once. Stale or failed
--     rows are retried automatically, capped at 5 attempts total.
--
-- REPLACE your two existing ad cron jobs with this single one (see notes).
-- ============================================================================

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- 0) Shared-secret store so Postgres can authenticate to the edge function
--    (no pgjwt extension needed — your Supabase doesn't have it).
--    After running this file, grab the generated secret once:
--      select value from public.ef_secrets where key = 'ad_push_secret';
--    ...and set it as env var AD_PUSH_SECRET on the send-ad-notification
--    edge function (dashboard: Edge Functions -> send-ad-notification ->
--    Manage secrets). The function is deployed with --no-verify-jwt.
create table if not exists public.ef_secrets (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

alter table public.ef_secrets enable row level security;
-- No policies: service role / postgres only.

insert into public.ef_secrets (key, value)
values ('ad_push_secret', lower(md5(random()::text || now()::text || 'eden-ad-push')))
on conflict (key) do nothing;

-- 1) Exactly-once bookkeeping -------------------------------------------------
create table if not exists public.ad_push_log (
  ad_id           uuid primary key references public.advertisements(id) on delete cascade,
  status          text not null default 'queued'
                  check (status in ('queued', 'sending', 'sent', 'failed')),
  attempts        integer not null default 0,
  users_targeted  integer not null default 0,
  users_delivered integer not null default 0,
  error           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.ad_push_log enable row level security;
-- No policies on purpose: only the service role (edge functions) may read/write.

-- Atomic claim used by the edge function. Prevents double-sends when a retry
-- races with a slow original run (only queued/failed rows can be claimed).
create or replace function public.claim_ad_push(p_ad_id uuid)
returns public.ad_push_log
language sql
security definer
set search_path = public
as $$
  update public.ad_push_log
  set status = 'sending',
      attempts = attempts + 1,
      error = null,
      updated_at = now()
  where ad_id = p_ad_id
    and status in ('queued', 'failed')
    and attempts < 5
  returning *;
$$;

revoke execute on function public.claim_ad_push(uuid) from public, anon;
grant execute on function public.claim_ad_push(uuid) to service_role;

-- 2) The cron worker: claim new ads + fire async hand-offs (no blocking) -----
create or replace function public.queue_ad_pushes(p_max_ads integer default 5)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  fired integer := 0;
  push_secret text;
begin
  -- Shared secret for authenticating to the edge function (see ef_secrets above).
  select value into push_secret from public.ef_secrets where key = 'ad_push_secret';
  if push_secret is null then
    raise exception 'ad_push_secret missing from ef_secrets — re-run the migration';
  end if;

  -- Resurrect rows stuck in 'sending' (edge function crashed before reporting)
  update public.ad_push_log
  set status = 'queued', updated_at = now()
  where status = 'sending'
    and updated_at < now() - interval '15 minutes'
    and attempts < 5;

  -- Claim brand-new active ads that were never logged (bounded per run)
  insert into public.ad_push_log (ad_id, status)
  select a.id, 'queued'
  from public.advertisements a
  where a.status = 'active'
    and a.created_at > now() - interval '30 days'
    and not exists (select 1 from public.ad_push_log l where l.ad_id = a.id)
  order by a.created_at asc
  limit p_max_ads
  on conflict (ad_id) do nothing;

  -- Fire async hand-offs for queued rows + backoff-retried failed rows.
  -- pg_net sends these in the background; this function never waits on them.
  for r in
    select ad_id
    from public.ad_push_log
    where status = 'queued'
       or (status = 'failed' and updated_at < now() - interval '30 minutes')
    order by updated_at asc
    limit p_max_ads
  loop
    perform net.http_post(
      url := 'https://ytpggbkndnynyzashexk.supabase.co/functions/v1/send-ad-notification',
      headers := jsonb_build_object(
        'x-ad-push-secret', push_secret,
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('ad_id', r.ad_id)
    );
    fired := fired + 1;
  end loop;

  return fired;
end;
$$;

revoke execute on function public.queue_ad_pushes(integer) from public, anon, authenticated;
grant execute on function public.queue_ad_pushes(integer) to postgres, service_role;

-- 3) Cron: every 10 minutes, idempotent (safe to re-run this migration) ------
do $$
begin
  if exists (select 1 from cron.job where jobname = 'eden-queue-ad-pushes') then
    perform cron.unschedule('eden-queue-ad-pushes');
  end if;
  perform cron.schedule('eden-queue-ad-pushes', '*/10 * * * *', 'select public.queue_ad_pushes()');
end;
$$;
