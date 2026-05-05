-- Safe Credit Management Functions

-- 1. Add Credits (for Top-ups)
CREATE OR REPLACE FUNCTION public.add_user_credits(
  p_user_id UUID,
  p_amount NUMERIC,
  p_reference TEXT,
  p_naira_amount NUMERIC DEFAULT NULL
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance NUMERIC;
BEGIN
  -- Insert or update balance atomically
  INSERT INTO public.user_credits (user_id, balance, updated_at)
  VALUES (p_user_id, p_amount, NOW())
  ON CONFLICT (user_id) DO UPDATE
  SET balance = user_credits.balance + p_amount,
      updated_at = NOW()
  RETURNING balance INTO v_new_balance;

  -- Log transaction if not already logged (paystack_reference is unique in this check)
  -- Note: paystack_reference is NOT unique in the table schema currently, but we check it here
  IF NOT EXISTS (SELECT 1 FROM public.credit_transactions WHERE paystack_reference = p_reference) THEN
    INSERT INTO public.credit_transactions (user_id, type, credits, naira_amount, paystack_reference)
    VALUES (p_user_id, 'topup', p_amount, p_naira_amount, p_reference);
  END IF;

  RETURN v_new_balance;
END;
$$;

-- 2. Deduct Credits (for Property Unlocks)
CREATE OR REPLACE FUNCTION public.deduct_user_credits(
  p_user_id UUID,
  p_property_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  new_balance NUMERIC,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance NUMERIC;
BEGIN
  -- 1. Check current balance
  SELECT balance INTO v_current_balance
  FROM public.user_credits
  WHERE user_id = p_user_id
  FOR UPDATE; -- Lock the row

  IF v_current_balance IS NULL OR v_current_balance < 1 THEN
    RETURN QUERY SELECT FALSE, COALESCE(v_current_balance, 0), 'insufficient_credits'::TEXT;
    RETURN;
  END IF;

  -- 2. Check if already unlocked (safety)
  IF EXISTS (SELECT 1 FROM public.property_unlocks WHERE user_id = p_user_id AND property_id = p_property_id) THEN
    RETURN QUERY SELECT TRUE, v_current_balance, 'already_unlocked'::TEXT;
    RETURN;
  END IF;

  -- 3. Deduct balance
  UPDATE public.user_credits
  SET balance = balance - 1,
      updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_current_balance;

  -- 4. Record unlock
  INSERT INTO public.property_unlocks (user_id, property_id)
  VALUES (p_user_id, p_property_id);

  -- 5. Log transaction
  INSERT INTO public.credit_transactions (user_id, type, credits, property_id)
  VALUES (p_user_id, 'unlock', -1, p_property_id);

  RETURN QUERY SELECT TRUE, v_current_balance, NULL::TEXT;
END;
$$;
