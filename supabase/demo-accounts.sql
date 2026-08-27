-- ============================================================================
-- EDEN — STORE REVIEWER DEMO ACCOUNTS
-- Run this in: Supabase Dashboard -> SQL Editor (PRODUCTION project)
-- Idempotent: safe to re-run; existing demo rows are left untouched.
--
-- WHY: your signup flow requires real NIN (NIMC) verification, so store
-- reviewers (Apple + Google) CANNOT create accounts on their own. Without
-- demo accounts, both stores will reject the app as "unreviewable".
--
-- CREATES:
--   1. DEMO TENANT    tenant.demo@edendemo.com    / EdenTenant#2026
--   2. DEMO LANDLORD  landlord.demo@edendemo.com  / EdenLandlord#2026
--      (with bank account + 3 live listings: Lekki, Yaba, Ibadan GRA)
--
-- BOTH accounts pass the NIN gate (is_verified + is_nin_verified = true)
-- and have completed_biodata = true, so sign-in lands straight in the app.
--
-- ---------------------------------------------------------------------------
-- COPY THESE INTO APP STORE CONNECT (Review Information -> Demo Account):
--   Account Name / Email:  tenant.demo@edendemo.com
--   Password:              EdenTenant#2026
--   (Add the landlord account as a second demo account)
--
-- COPY THESE INTO PLAY CONSOLE (Release -> Notes to reviewer):
--   "Demo accounts (the app requires Nigerian NIN identity verification at
--   signup, so reviewers cannot self-register):
--   Tenant:  tenant.demo@edendemo.com  /  EdenTenant#2026
--   Landlord: landlord.demo@edendemo.com  /  EdenLandlord#2026"
-- ---------------------------------------------------------------------------
-- OPTIONAL but recommended: replace the demo bank account below with a real
-- account you control, so you can also demo the full rent -> escrow ->
-- payout flow end to end.
-- ============================================================================

create extension if not exists pgcrypto;

-- ============================================================
-- 1) DEMO TENANT
-- ============================================================
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, last_sign_in_at)
select gen_random_uuid(), 'authenticated', 'authenticated', 'tenant.demo@edendemo.com',
       crypt('EdenTenant#2026', gen_salt('bf', 10)), now(),
       '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
       now(), now(), now()
where not exists (select 1 from auth.users where email = 'tenant.demo@edendemo.com');

insert into auth.identities (id, user_id, identity_data, provider_id, last_sign_in_at, provider, created_at, updated_at)
select gen_random_uuid(), u.id,
       jsonb_build_object('email', 'tenant.demo@edendemo.com', 'email_verified', true, 'sub', u.id),
       u.id, now(), 'email', now(), now()
from auth.users u
where u.email = 'tenant.demo@edendemo.com'
  and not exists (select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email');

insert into public.users (id, email, first_name, last_name, role, is_verified, is_nin_verified, completed_biodata, is_verified_renter, push_notifications_enabled)
select u.id, 'tenant.demo@edendemo.com', 'Adaeze', 'Okafor', 'TENANT', true, true, true, true, true
from auth.users u
where u.email = 'tenant.demo@edendemo.com'
  and not exists (select 1 from public.users x where x.id = u.id);

insert into public.user_biodata (id, phone_number, dob, gender, profile_photo, employment_status, employer_name, monthly_income_range, next_of_kin_name, next_of_kin_phone, next_of_kin_relationship)
select u.id, '08120000001', '1992-05-14', 'female',
       'https://i.pravatar.cc/300?img=47', 'employed', 'Zenith Bank', '1000000+', 'Chinedu Okafor', '08120000002', 'brother'
from auth.users u
where u.email = 'tenant.demo@edendemo.com'
  and not exists (select 1 from public.user_biodata b where b.id = u.id);

-- ============================================================
-- 2) DEMO LANDLORD (owner of the 3 demo listings)
-- ============================================================
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, last_sign_in_at)
select gen_random_uuid(), 'authenticated', 'authenticated', 'landlord.demo@edendemo.com',
       crypt('EdenLandlord#2026', gen_salt('bf', 10)), now(),
       '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
       now(), now(), now()
where not exists (select 1 from auth.users where email = 'landlord.demo@edendemo.com');

insert into auth.identities (id, user_id, identity_data, provider_id, last_sign_in_at, provider, created_at, updated_at)
select gen_random_uuid(), u.id,
       jsonb_build_object('email', 'landlord.demo@edendemo.com', 'email_verified', true, 'sub', u.id),
       u.id, now(), 'email', now(), now()
from auth.users u
where u.email = 'landlord.demo@edendemo.com'
  and not exists (select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email');

insert into public.users (id, email, first_name, last_name, role, is_verified, is_nin_verified, completed_biodata, is_verified_renter, push_notifications_enabled)
select u.id, 'landlord.demo@edendemo.com', 'Tunde', 'Balogun', 'LANDLORD', true, true, true, false, true
from auth.users u
where u.email = 'landlord.demo@edendemo.com'
  and not exists (select 1 from public.users x where x.id = u.id);

insert into public.user_biodata (id, phone_number, dob, gender, profile_photo, employment_status, employer_name, monthly_income_range, next_of_kin_name, next_of_kin_phone, next_of_kin_relationship)
select u.id, '08120000003', '1985-11-02', 'male',
       'https://i.pravatar.cc/300?img=12', 'self-employed', 'Balogun Properties', '2000000+', 'Funke Balogun', '08120000004', 'spouse'
from auth.users u
where u.email = 'landlord.demo@edendemo.com'
  and not exists (select 1 from public.user_biodata b where b.id = u.id);

-- Demo bank account (GTBank). REPLACE with a real account if you want to
-- demo the payout end-to-end. paystack_recipient_code stays null — the
-- normal flow creates it on first payout via your create-owner-recipient.
insert into public.bank_accounts (user_id, bank_name, account_number, account_name, bank_code)
select u.id, 'GTBank', '0123456789', 'Tunde Balogun', '058'
from auth.users u
where u.email = 'landlord.demo@edendemo.com'
  and not exists (select 1 from public.bank_accounts b where b.user_id = u.id);

-- ============================================================
-- 3) THREE LIVE LISTINGS (so the tenant demo has real content)
-- ============================================================
insert into public.properties (id, title, description, price, location, type, images, amenities, landlord_id, state, lga, landmark, bedrooms, bathrooms, toilets, furnishing, parking, availability_date, status, listing_purpose, billing_period, agency_fee_percentage, caution_fee, legal_fee, total_price)
select gen_random_uuid(),
       '2 Bedroom Flat in Lekki Phase 1, Lekki',
       'Neatly finished 2 bedroom flat in a quiet phase 1 street. Borehole, 24hr security, ample parking. Ideal for a young family or professionals working on the Island.',
       4500000, 'Lekki Phase 1, Lekki, Lagos', 'flat',
       array['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=60',
             'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=900&q=60'],
       array['Borehole', '24hr Security', 'Parking', 'Power Backup'],
       u.id, 'Lagos', 'Lekki', 'Off Admiralty Way', 2, 2, 1, 'furnished', true,
       now()::date, 'available', 'rent', 'yearly', 5, 450000, 450000, 4500000 * 1.05 + 450000 + 450000
from auth.users u
where u.email = 'landlord.demo@edendemo.com'
  and not exists (select 1 from public.properties p where p.landlord_id = u.id and p.title = '2 Bedroom Flat in Lekki Phase 1, Lekki');

insert into public.properties (id, title, description, price, location, type, images, amenities, landlord_id, state, lga, landmark, bedrooms, bathrooms, toilets, furnishing, parking, availability_date, status, listing_purpose, billing_period, agency_fee_percentage, caution_fee, legal_fee, total_price)
select gen_random_uuid(),
       '1 Bedroom Apartment in Yaba, Lagos',
       'Compact 1 bedroom apartment in a well-maintained building close to Yaba market and the University of Lagos bridge. Good natural light, metered power.',
       2500000, 'Yaba, Lagos', 'apartment',
       array['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=900&q=60',
             'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=900&q=60'],
       array['Borehole', 'Metered Power', 'Elevator'],
       u.id, 'Lagos', 'Yaba', 'Beside UL Bridge', 1, 1, 1, 'unfurnished', false,
       now()::date, 'available', 'rent', 'yearly', 5, 250000, 250000, 2500000 * 1.05 + 250000 + 250000
from auth.users u
where u.email = 'landlord.demo@edendemo.com'
  and not exists (select 1 from public.properties p where p.landlord_id = u.id and p.title = '1 Bedroom Apartment in Yaba, Lagos');

insert into public.properties (id, title, description, price, location, type, images, amenities, landlord_id, state, lga, landmark, bedrooms, bathrooms, toilets, furnishing, parking, availability_date, status, listing_purpose, billing_period, agency_fee_percentage, caution_fee, legal_fee, total_price)
select gen_random_uuid(),
       '3 Bedroom Terrace in GRA, Ibadan',
       'Elegant 3 bedroom terrace in the upscale GRA area of Ibadan. Spacious rooms, dedicated parking, quiet neighborhood with reliable power supply.',
       3800000, 'GRA, Ibadan, Oyo State', 'terrace',
       array['https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=900&q=60',
             'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=60'],
       array['Borehole', 'Parking', 'Fenced Compound', 'Power Backup'],
       u.id, 'Oyo', 'Ibadan North', 'GRA Roundabout', 3, 3, 2, 'semi-furnished', true,
       now()::date, 'available', 'rent', 'yearly', 5, 380000, 380000, 3800000 * 1.05 + 380000 + 380000
from auth.users u
where u.email = 'landlord.demo@edendemo.com'
  and not exists (select 1 from public.properties p where p.landlord_id = u.id and p.title = '3 Bedroom Terrace in GRA, Ibadan');

-- ============================================================
-- VERIFY (optional):
-- select u.email, p.first_name, p.last_name, p.role, p.is_verified, p.completed_biodata
-- from public.users p left join auth.users u on u.id = p.id
-- where u.email like '%demo@edendemo.com';
--
-- After running: sign in with each account in the app to confirm the
-- reviewer lands directly in the main app (no NIN step, no empty states).
-- ============================================================
