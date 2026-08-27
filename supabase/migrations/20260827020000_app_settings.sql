-- ============================================================================
-- App settings: maintenance mode switch + store version tracking
--
-- Toggle maintenance mode (full-app lock screen until flipped back):
--   on:  update public.app_settings set value = 'on',  updated_at = now() where key = 'maintenance_mode';
--   off: update public.app_settings set value = 'off', updated_at = now() where key = 'maintenance_mode';
--
-- Announce a new store build (banners appear for users on older builds):
--   update public.app_settings
--   set value = '1.1.0', updated_at = now() where key = 'latest_version';
--   update public.app_settings
--   set value = 'New inspection flow + faster search', updated_at = now() where key = 'release_notes';
--
-- App polls this table every 60s and whenever it returns to the foreground.
-- Writes are service-role only — the app can read, but never flip these.
-- ============================================================================

create table if not exists public.app_settings (
  key        text primary key,
  value      text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

drop policy if exists "app_settings_read" on public.app_settings;
create policy "app_settings_read"
  on public.app_settings for select
  to authenticated
  using (true);
-- No insert/update/delete policies: only service role / postgres can write.

insert into public.app_settings (key, value)
values
  ('maintenance_mode',  'off'),
  ('latest_version',    '0.0.0'),
  ('release_notes',     ''),
  ('store_url_android', 'https://play.google.com/store/apps/details?id=com.eden.mobile'),
  ('store_url_ios',     '')
on conflict (key) do nothing;
