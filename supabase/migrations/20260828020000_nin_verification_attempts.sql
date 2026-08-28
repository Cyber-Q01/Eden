-- Rate-limit bookkeeping for the paid Billscribe NIN verification API.
-- verify-nin records EVERY attempt that reaches Billscribe (success or fail) so it
-- can enforce: 3 attempts/user/24h, 2-min cooldown/user, 5 failures/NIN/24h lockout.
-- Only nin_hash (HMAC) is stored — never the raw NIN (same zero-plaintext policy as users.nin_hash).

create table if not exists public.nin_verification_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users (id) on delete cascade,
  nin_hash text not null,
  success boolean not null,
  created_at timestamptz not null default now()
);

create index if not exists nin_attempts_user_created_idx
  on public.nin_verification_attempts (user_id, created_at desc);

create index if not exists nin_attempts_hash_created_idx
  on public.nin_verification_attempts (nin_hash, created_at desc);

-- Optional: prune rows older than 30 days (runs fine on demand; not required for correctness)
-- select delete from public.nin_verification_attempts where created_at < now() - interval '30 days';
