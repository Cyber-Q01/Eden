-- =============================================================================
-- FIX: Application photos (selfie, full photo, proof of income, reference
-- letter) do not display on the Application Review page.
--
-- ROOT CAUSE:
--   Application verification files are uploaded to the 'request-images'
--   storage bucket, and the app renders their PUBLIC URLs
--   (https://<project>.supabase.co/storage/v1/object/public/request-images/...).
--   The bucket is NOT public, so those URLs return 403 and the photos are
--   invisible on the review screen.
--
-- This migration makes the bucket public (creates it first if it is missing).
--
-- HOW TO APPLY:
--   1. Supabase Dashboard -> SQL Editor -> paste & run this file, OR
--   2. `supabase db push` (with the project linked), OR
--   3. Dashboard -> Storage -> 'request-images' -> enable "Public" manually.
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('request-images', 'request-images', true)
on conflict (id) do update
set public = excluded.public,
    name = excluded.name;

-- Explicit public read policy: keeps working even if the bucket is ever
-- switched back to private (authenticated/anon reads).
drop policy if exists "Public read for request-images" on storage.objects;
create policy "Public read for request-images"
    on storage.objects for select
    using (bucket_id = 'request-images');
