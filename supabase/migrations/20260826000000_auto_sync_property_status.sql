-- =============================================================
-- Eden — Auto-sync properties.status from the rentals table
--
-- RULE (rentals is the single source of truth):
--   A property is 'taken' while it has at least one rental in
--   awaiting_payment, awaiting_confirmation, confirmed, disputed
--   or released. It is 'available' only when it has NO such
--   rental (a refunded rental does not keep a property taken).
--
-- 1) sync_property_statuses() — idempotent full re-derivation.
--    Run once now (fixes existing bad data) and every 15 min
--    by pg_cron as a self-healing safety net.
-- 2) Trigger on rentals       — keeps the status in sync
--    INSTANTLY whenever a rental is created, changes status,
--    or is deleted (covers app, edge functions, admin edits).
--
-- HOW TO RUN: paste this whole file into the Supabase SQL
-- Editor and Run. Afterwards, fix your current data
-- immediately by running:  select public.sync_property_statuses();
-- =============================================================

-- ── 1. The sync function ────────────────────────────────────
create or replace function public.sync_property_statuses()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
    updated_count integer := 0;
begin
    update properties p
    set status = case
            when exists (
                select 1
                from rentals r
                where r.property_id = p.id
                  and r.status in ('awaiting_payment', 'awaiting_confirmation',
                                   'confirmed', 'disputed', 'released')
            ) then 'taken'
            else 'available'
        end,
        updated_at = now()
    where p.status <> 'deleted'
      and p.status <> case
            when exists (
                select 1
                from rentals r
                where r.property_id = p.id
                  and r.status in ('awaiting_payment', 'awaiting_confirmation',
                                   'confirmed', 'disputed', 'released')
            ) then 'taken'
            else 'available'
        end;

    get diagnostics updated_count = row_count;
    return updated_count;
end;
$$;

-- Only trusted roles may run it (pg_cron runs as postgres)
revoke execute on function public.sync_property_statuses() from public, anon, authenticated;
grant execute on function public.sync_property_statuses() to postgres, service_role;

-- ── 2. Instant sync trigger on the rentals table ────────────
create or replace function public.handle_rental_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    prop_id uuid;
begin
    prop_id := coalesce(new.property_id, old.property_id);

    if prop_id is not null then
        update properties p
        set status = case
                when exists (
                    select 1
                    from rentals r
                    where r.property_id = p.id
                      and r.status in ('awaiting_payment', 'awaiting_confirmation',
                                       'confirmed', 'disputed', 'released')
                ) then 'taken'
                else 'available'
            end,
            updated_at = now()
        where p.id = prop_id
          and p.status <> 'deleted';
    end if;

    return coalesce(new, old);
end;
$$;

drop trigger if exists trg_rentals_sync_property_status on public.rentals;
create trigger trg_rentals_sync_property_status
    after insert or update of status or delete
    on public.rentals
    for each row
    execute function public.handle_rental_status_change();

-- ── 3. Scheduled safety net (every 15 minutes) ──────────────
create extension if not exists pg_cron;

-- Idempotent: remove any previous schedule before (re)scheduling
select cron.unschedule('eden-sync-property-statuses')
where exists (select 1 from cron.job where jobname = 'eden-sync-property-statuses');

select cron.schedule(
    'eden-sync-property-statuses',
    '*/15 * * * *',
    'select public.sync_property_statuses()'
);
