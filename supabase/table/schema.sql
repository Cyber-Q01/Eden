-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.ai_cache (
  cache_key text NOT NULL,
  type text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  CONSTRAINT ai_cache_pkey PRIMARY KEY (cache_key)
);
CREATE TABLE public.ai_logs (
  id bigint NOT NULL DEFAULT nextval('ai_logs_id_seq'::regclass),
  user_id uuid,
  type text NOT NULL,
  prompt_tokens integer,
  response_tokens integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ai_logs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.ai_rate_limits (
  user_id uuid NOT NULL,
  window_start timestamp with time zone NOT NULL,
  request_count integer NOT NULL DEFAULT 0,
  CONSTRAINT ai_rate_limits_pkey PRIMARY KEY (user_id, window_start)
);
CREATE TABLE public.bank_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  bank_name text NOT NULL,
  account_number text NOT NULL,
  account_name text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  paystack_recipient_code text,
  paystack_recipient_id text,
  CONSTRAINT bank_accounts_pkey PRIMARY KEY (id),
  CONSTRAINT bank_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.complaint_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  photos ARRAY DEFAULT '{}'::text[],
  status text DEFAULT 'open'::text CHECK (status = ANY (ARRAY['open'::text, 'under_review'::text, 'resolved'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT complaint_requests_pkey PRIMARY KEY (id),
  CONSTRAINT complaint_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  participant_a_id uuid NOT NULL,
  participant_b_id uuid NOT NULL,
  last_message_text text,
  last_message_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT conversations_pkey PRIMARY KEY (id),
  CONSTRAINT conversations_participant_a_id_fkey FOREIGN KEY (participant_a_id) REFERENCES public.users(id),
  CONSTRAINT conversations_participant_b_id_fkey FOREIGN KEY (participant_b_id) REFERENCES public.users(id)
);
CREATE TABLE public.credit_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['topup'::text, 'unlock'::text])),
  credits numeric NOT NULL,
  naira_amount numeric,
  paystack_reference text,
  property_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT credit_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT credit_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT credit_transactions_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id)
);
CREATE TABLE public.favorites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  property_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT favorites_pkey PRIMARY KEY (id),
  CONSTRAINT favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT favorites_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id)
);
CREATE TABLE public.maintenance_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  photos ARRAY DEFAULT '{}'::text[],
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'resolved'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT maintenance_requests_pkey PRIMARY KEY (id),
  CONSTRAINT maintenance_requests_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.users(id)
);
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id),
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id)
);
CREATE TABLE public.neighbourhood_insights (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  state text NOT NULL,
  lga text NOT NULL,
  summary text,
  vibe text,
  power_supply text,
  transport text,
  safety text,
  schools text,
  markets text,
  generated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT neighbourhood_insights_pkey PRIMARY KEY (id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['new_application'::text, 'application_accepted'::text, 'application_declined'::text, 'payment_received'::text, 'rental_confirmed'::text, 'agreement_signed'::text, 'system'::text])),
  title text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  read boolean DEFAULT false,
  action_url text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['membership'::text, 'rent'::text])),
  amount numeric NOT NULL,
  paystack_reference text NOT NULL UNIQUE,
  paystack_status text,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'successful'::text, 'failed'::text, 'refunded'::text])),
  metadata jsonb DEFAULT '{}'::jsonb,
  paid_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  rental_id uuid,
  paystack_reference_used text,
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT payments_rental_id_fkey FOREIGN KEY (rental_id) REFERENCES public.rentals(id)
);
CREATE TABLE public.payouts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  rental_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  amount numeric NOT NULL,
  platform_fee numeric NOT NULL,
  transfer_reference text NOT NULL UNIQUE,
  transfer_code text,
  paystack_recipient_code text NOT NULL,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'success'::text, 'failed'::text, 'reversed'::text])),
  initiated_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT payouts_pkey PRIMARY KEY (id),
  CONSTRAINT payouts_rental_id_fkey FOREIGN KEY (rental_id) REFERENCES public.rentals(id),
  CONSTRAINT payouts_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id)
);
CREATE TABLE public.price_analyses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL UNIQUE,
  verdict text CHECK (verdict = ANY (ARRAY['fair'::text, 'above_average'::text, 'below_average'::text, 'suspicious'::text])),
  badge text,
  warning text,
  summary text,
  average_price numeric,
  price_range_low numeric,
  price_range_high numeric,
  confidence text CHECK (confidence = ANY (ARRAY['high'::text, 'medium'::text, 'low'::text])),
  comparables_count integer DEFAULT 0,
  analysed_at timestamp with time zone DEFAULT now(),
  CONSTRAINT price_analyses_pkey PRIMARY KEY (id),
  CONSTRAINT price_analyses_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id)
);
CREATE TABLE public.properties (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  price numeric NOT NULL,
  location text NOT NULL,
  type text NOT NULL,
  images ARRAY DEFAULT '{}'::text[],
  amenities ARRAY DEFAULT '{}'::text[],
  landlord_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  listing_purpose text DEFAULT 'rent'::text CHECK (listing_purpose = ANY (ARRAY['rent'::text, 'sale'::text])),
  billing_period text DEFAULT 'yearly'::text CHECK (billing_period = ANY (ARRAY['monthly'::text, 'quarterly'::text, 'yearly'::text])),
  state text,
  lga text,
  landmark text,
  bedrooms integer DEFAULT 0,
  bathrooms integer DEFAULT 0,
  toilets integer DEFAULT 0,
  furnishing text DEFAULT 'unfurnished'::text CHECK (furnishing = ANY (ARRAY['furnished'::text, 'semi-furnished'::text, 'unfurnished'::text])),
  parking boolean DEFAULT false,
  availability_date date DEFAULT CURRENT_DATE,
  status text DEFAULT 'available'::text CHECK (status = ANY (ARRAY['available'::text, 'taken'::text])),
  agency_fee_percentage numeric DEFAULT 0,
  caution_fee numeric DEFAULT 0,
  legal_fee numeric DEFAULT 0,
  service_fee_percentage numeric DEFAULT 1.5,
  total_price numeric,
  CONSTRAINT properties_pkey PRIMARY KEY (id),
  CONSTRAINT properties_landlord_id_fkey FOREIGN KEY (landlord_id) REFERENCES public.users(id)
);
CREATE TABLE public.property_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  renter_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  move_in_date date NOT NULL,
  message text NOT NULL,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT property_applications_pkey PRIMARY KEY (id),
  CONSTRAINT property_applications_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id),
  CONSTRAINT property_applications_renter_id_fkey FOREIGN KEY (renter_id) REFERENCES public.users(id),
  CONSTRAINT property_applications_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id)
);
CREATE TABLE public.property_unlocks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  property_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT property_unlocks_pkey PRIMARY KEY (id),
  CONSTRAINT property_unlocks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT property_unlocks_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id)
);
CREATE TABLE public.rentals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  application_id uuid,
  property_id uuid NOT NULL,
  renter_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  amount numeric NOT NULL,
  platform_fee numeric NOT NULL,
  owner_payout numeric NOT NULL,
  paystack_reference text NOT NULL UNIQUE,
  status text DEFAULT 'awaiting_payment'::text CHECK (status = ANY (ARRAY['awaiting_payment'::text, 'awaiting_confirmation'::text, 'confirmed'::text, 'disputed'::text, 'released'::text, 'refunded'::text])),
  confirmation_deadline timestamp with time zone,
  transfer_reference text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  active_paystack_reference text,
  CONSTRAINT rentals_pkey PRIMARY KEY (id),
  CONSTRAINT rentals_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id),
  CONSTRAINT rentals_renter_id_fkey FOREIGN KEY (renter_id) REFERENCES public.users(id),
  CONSTRAINT rentals_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id),
  CONSTRAINT rentals_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.property_applications(id)
);
CREATE TABLE public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric NOT NULL,
  features ARRAY DEFAULT '{}'::text[],
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT subscriptions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tenancy_agreements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  rental_id uuid NOT NULL,
  property_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  renter_id uuid NOT NULL,
  agreement_text text NOT NULL,
  custom_clauses ARRAY DEFAULT '{}'::text[],
  uploaded_pdf_url text,
  owner_signed_at timestamp with time zone,
  renter_signed_at timestamp with time zone,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'owner_signed'::text, 'fully_signed'::text, 'voided'::text])),
  pdf_url text,
  created_at timestamp with time zone DEFAULT now(),
  generation_type text DEFAULT 'ai'::text CHECK (generation_type = ANY (ARRAY['ai'::text, 'manual'::text])),
  CONSTRAINT tenancy_agreements_pkey PRIMARY KEY (id),
  CONSTRAINT tenancy_agreements_rental_id_fkey FOREIGN KEY (rental_id) REFERENCES public.rentals(id),
  CONSTRAINT tenancy_agreements_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id),
  CONSTRAINT tenancy_agreements_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id),
  CONSTRAINT tenancy_agreements_renter_id_fkey FOREIGN KEY (renter_id) REFERENCES public.users(id)
);
CREATE TABLE public.user_biodata (
  id uuid NOT NULL,
  phone_number text,
  dob date,
  gender text,
  profile_photo text,
  id_type text,
  id_number text,
  id_front_image text,
  id_back_image text,
  employment_status text,
  employer_name text,
  monthly_income_range text,
  next_of_kin_name text,
  next_of_kin_phone text,
  next_of_kin_relationship text,
  business_name text,
  cac_number text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_biodata_pkey PRIMARY KEY (id),
  CONSTRAINT user_biodata_id_fkey FOREIGN KEY (id) REFERENCES public.users(id)
);
CREATE TABLE public.user_credits (
  user_id uuid NOT NULL,
  balance numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_credits_pkey PRIMARY KEY (user_id),
  CONSTRAINT user_credits_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL,
  email text NOT NULL UNIQUE,
  first_name text,
  last_name text,
  role USER-DEFINED DEFAULT 'TENANT'::user_role,
  is_verified boolean DEFAULT false,
  smile_job_id text,
  id_number text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  completed_biodata boolean NOT NULL DEFAULT false,
  is_verified_renter boolean DEFAULT false,
  membership_paid_at timestamp with time zone,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);