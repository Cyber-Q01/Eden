-- ==============================================================================
-- CREDIT UNLOCK SYSTEM — MIGRATION
-- ==============================================================================

-- 1. User Credits — stores each user's credit balance
CREATE TABLE IF NOT EXISTS public.user_credits (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  balance NUMERIC DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

-- Users can only READ their own balance (edge functions use admin client to write)
CREATE POLICY "Users can view own credits"
  ON public.user_credits FOR SELECT
  USING (auth.uid() = user_id);


-- 2. Credit Transactions — audit log for every top-up and unlock spend
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('topup', 'unlock')),
  credits NUMERIC NOT NULL,
  naira_amount NUMERIC,
  paystack_reference TEXT,
  property_id UUID REFERENCES public.properties(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user ON public.credit_transactions(user_id);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON public.credit_transactions FOR SELECT
  USING (auth.uid() = user_id);


-- 3. Property Unlocks — tracks which properties a user has unlocked
CREATE TABLE IF NOT EXISTS public.property_unlocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, property_id)
);

CREATE INDEX IF NOT EXISTS idx_property_unlocks_user ON public.property_unlocks(user_id);
CREATE INDEX IF NOT EXISTS idx_property_unlocks_property ON public.property_unlocks(property_id);

ALTER TABLE public.property_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own unlocks"
  ON public.property_unlocks FOR SELECT
  USING (auth.uid() = user_id);
