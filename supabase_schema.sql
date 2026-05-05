-- ==============================================================================
-- EDENHOME SUPABASE SCHEMA & RLS POLICIES
-- ==============================================================================

-- 1. Create Enums
CREATE TYPE user_role AS ENUM ('TENANT', 'LANDLORD', 'ADMIN');

-- 2. Create Public Users Table (Extends auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role user_role DEFAULT 'TENANT'::user_role,
  is_verified BOOLEAN DEFAULT false,
  completed_biodata BOOLEAN DEFAULT false,
  smile_job_id TEXT,
  id_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: We enable RLS on the users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view their own profile."
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile."
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Trigger to automatically create a public.user when an auth.user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'firstName',
    NEW.raw_user_meta_data->>'lastName',
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'TENANT'::user_role)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 3. Create Properties Table
CREATE TABLE public.properties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC NOT NULL,
  location TEXT NOT NULL,
  type TEXT NOT NULL, -- e.g. "2 Bedroom"
  images TEXT[] DEFAULT '{}',
  amenities TEXT[] DEFAULT '{}',
  landlord_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Properties are public to read
CREATE POLICY "Properties are publicly viewable."
  ON public.properties FOR SELECT
  USING (true);

-- Only Landlords can insert properties
CREATE POLICY "Landlords can create properties."
  ON public.properties FOR INSERT
  WITH CHECK (
    auth.uid() = landlord_id AND 
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('LANDLORD', 'ADMIN'))
  );

-- Landlords can update their own properties
CREATE POLICY "Landlords can update their own properties."
  ON public.properties FOR UPDATE
  USING (auth.uid() = landlord_id);

-- Landlords can delete their own properties
CREATE POLICY "Landlords can delete their own properties."
  ON public.properties FOR DELETE
  USING (auth.uid() = landlord_id);


-- 4. Create Favorites Table
CREATE TABLE public.favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, property_id)
);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Users can see their own favorites
CREATE POLICY "Users can read their own favorites."
  ON public.favorites FOR SELECT
  USING (auth.uid() = user_id);

-- Users can add to their favorites
CREATE POLICY "Users can add favorites."
  ON public.favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their favorites
CREATE POLICY "Users can delete their favorites."
  ON public.favorites FOR DELETE
  USING (auth.uid() = user_id);


-- 5. Create Subscriptions Table
CREATE TABLE public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  features TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Subscriptions are publicly readable
CREATE POLICY "Subscriptions are publicly viewable."
  ON public.subscriptions FOR SELECT
  USING (true);

-- Only Admins can modify subscriptions
CREATE POLICY "Admins can manage subscriptions"
  ON public.subscriptions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN'));


-- 6. Setup Storage Buckets
-- Note: Requires running these inside the Supabase SQL editor or via dashboard as it touches storage schema
INSERT INTO storage.buckets (id, name, public) VALUES ('property-images', 'property-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies: Public reading
CREATE POLICY "Property Images are publicly accessible."
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'property-images' );

-- Storage Policies: Authenticated users can upload (Ideally restrict to Landlords via RLS, but bucket level is done here)
CREATE POLICY "Users can upload property images."
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'property-images' AND 
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can delete their own images."
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'property-images' AND
    auth.uid() = owner
  );


-- ==============================================================================
-- 7. CHAT: CONVERSATIONS TABLE
-- One row per unique pair. DB trigger keeps last_message_text in sync.
-- ==============================================================================

CREATE TABLE public.conversations (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_a_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  participant_b_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  last_message_text  TEXT,
  last_message_at    TIMESTAMPTZ DEFAULT NOW(),
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  -- Prevent duplicate conversations between the same two users
  UNIQUE(participant_a_id, participant_b_id)
);

-- Indexes for fast participant lookups and sorting
CREATE INDEX idx_conversations_participant_a ON public.conversations(participant_a_id);
CREATE INDEX idx_conversations_participant_b ON public.conversations(participant_b_id);
CREATE INDEX idx_conversations_last_message  ON public.conversations(last_message_at DESC);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conversations."
  ON public.conversations FOR SELECT
  USING (auth.uid() = participant_a_id OR auth.uid() = participant_b_id);

CREATE POLICY "Users can create conversations."
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = participant_a_id OR auth.uid() = participant_b_id);


-- ==============================================================================
-- 8. CHAT: MESSAGES TABLE
-- Separate row per message. Indexed for fast conversation thread loading.
-- ==============================================================================

CREATE TABLE public.messages (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  is_read         BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Composite index: fetch all messages in a conversation sorted chronologically
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id, created_at ASC);
CREATE INDEX idx_messages_sender       ON public.messages(sender_id);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users can only read messages from conversations they belong to
CREATE POLICY "Users can view messages in their conversations."
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.participant_a_id = auth.uid() OR c.participant_b_id = auth.uid())
    )
  );

-- Users can only send messages in their own conversations as themselves
CREATE POLICY "Users can send messages in their conversations."
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.participant_a_id = auth.uid() OR c.participant_b_id = auth.uid())
    )
  );

-- Users can mark messages as read
CREATE POLICY "Users can update read status of messages."
  ON public.messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.participant_a_id = auth.uid() OR c.participant_b_id = auth.uid())
    )
  );

-- DB Trigger: auto-update conversation's last_message_text on every new message
-- This removes the need for a second write from the client
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET
    last_message_text = NEW.content,
    last_message_at   = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE PROCEDURE public.update_conversation_last_message();

-- Enable Supabase Realtime on messages (required for live chat subscription)
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;


-- ==============================================================================
-- 9. MAINTENANCE REQUESTS
-- ==============================================================================

CREATE TABLE public.maintenance_requests (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category    TEXT NOT NULL,
  description TEXT NOT NULL,
  photos      TEXT[] DEFAULT '{}',
  status      TEXT DEFAULT 'pending'
              CHECK (status IN ('pending', 'in_progress', 'resolved')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_maintenance_tenant ON public.maintenance_requests(tenant_id);

ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can manage their own maintenance requests."
  ON public.maintenance_requests FOR ALL
  USING (auth.uid() = tenant_id);


-- ==============================================================================
-- 10. COMPLAINT REQUESTS
-- ==============================================================================

CREATE TABLE public.complaint_requests (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category    TEXT NOT NULL,
  description TEXT NOT NULL,
  photos      TEXT[] DEFAULT '{}',
  status      TEXT DEFAULT 'open'
              CHECK (status IN ('open', 'under_review', 'resolved')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_complaints_user ON public.complaint_requests(user_id);

ALTER TABLE public.complaint_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own complaints."
  ON public.complaint_requests FOR ALL
  USING (auth.uid() = user_id);


-- ==============================================================================
-- 11. BANK ACCOUNTS (Landlords)
-- One bank account per landlord enforced by UNIQUE(user_id)
-- ==============================================================================

CREATE TABLE public.bank_accounts (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  bank_name      TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_name   TEXT NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Landlords can manage their own bank account."
  ON public.bank_accounts FOR ALL
  USING (auth.uid() = user_id);


-- ==============================================================================
-- 12. REQUEST IMAGES STORAGE BUCKET
-- Private bucket — only the owner can view their own uploads
-- ==============================================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('request-images', 'request-images', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload request images."
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'request-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can view their own request images."
  ON storage.objects FOR SELECT
  USING (bucket_id = 'request-images' AND auth.uid() = owner);

CREATE POLICY "Users can delete their own request images."
  ON storage.objects FOR DELETE
  USING (bucket_id = 'request-images' AND auth.uid() = owner);


-- ==============================================================================
-- 13. USER BIO DATA
-- Stores additional info like occupation, next of kin, business details
-- ==============================================================================

CREATE TABLE public.user_biodata (
  id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  phone_number TEXT,
  dob DATE,
  gender TEXT,
  profile_photo TEXT,
  id_type TEXT,
  id_number TEXT,
  id_front_image TEXT,
  id_back_image TEXT,
  employment_status TEXT,
  employer_name TEXT,
  monthly_income_range TEXT,
  next_of_kin_name TEXT,
  next_of_kin_phone TEXT,
  next_of_kin_relationship TEXT,
  business_name TEXT,
  cac_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_biodata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own biodata."
  ON public.user_biodata FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert/update their own biodata."
  ON public.user_biodata FOR ALL
  USING (auth.uid() = id);


