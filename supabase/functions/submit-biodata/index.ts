import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// Create admin client to bypass RLS for user metadata and table updates
function createAdminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}

// Create user client using their auth header
function createUserClient(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) throw new Error('Missing Authorization header');

  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  );
}

Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUserClient = createUserClient(req);
    const supabaseAdminClient = createAdminClient();

    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabaseUserClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }
    const userId = user.id;
    const role = user.user_metadata?.role || 'TENANT';

    // 1b. Strict NIN Verification Guard: Check that user has verified NIN with NIMC
    const { data: userDbRecord } = await supabaseAdminClient
      .from('users')
      .select('first_name, last_name, email, role, is_verified, is_nin_verified')
      .eq('id', userId)
      .maybeSingle();

    const isNinVerified = Boolean(userDbRecord?.is_verified || userDbRecord?.is_nin_verified);
    if (!isNinVerified) {
      return new Response(
        JSON.stringify({ error: "NIN Verification Required: You must verify your National ID (NIN) with NIMC before completing registration." }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Parse payload
    const body = await req.json();
    const {
      first_name,
      last_name,
      firstName,
      lastName,
      phone_number,
      dob,
      gender,
      profile_photo,
      id_type,
      id_number,
      id_front_image,
      id_back_image,
      employment_status,
      employer_name,
      monthly_income_range,
      next_of_kin_name,
      next_of_kin_phone,
      next_of_kin_relationship,
      business_name,
      cac_number,
      bank_name,
      account_number,
      account_name,
      bank_code
    } = body;

    // Resolve Legal First Name & Last Name (Payload -> DB Record -> Auth Metadata)
    const rawFirst = first_name || firstName || '';
    const rawLast = last_name || lastName || '';

    const resolvedFirstName = (
      rawFirst ||
      userDbRecord?.first_name ||
      user.user_metadata?.first_name ||
      user.user_metadata?.firstName ||
      ''
    ).trim();

    const resolvedLastName = (
      rawLast ||
      userDbRecord?.last_name ||
      user.user_metadata?.last_name ||
      user.user_metadata?.lastName ||
      ''
    ).trim();

    console.log(`[submit-biodata] Processing user ${userId} (${resolvedFirstName} ${resolvedLastName})...`);

    // 3. Insert/Update Bio Data via Admin Client
    const bioDataPayload: any = {
      id: userId,
      phone_number: phone_number || undefined,
      dob: dob || undefined,
      gender: gender || undefined,
      profile_photo: profile_photo || undefined,
      id_type: id_type || 'NIN',
      id_number: id_number || undefined,
      id_front_image: id_front_image || undefined,
      id_back_image: id_back_image || undefined,
      next_of_kin_name: next_of_kin_name || undefined,
      next_of_kin_phone: next_of_kin_phone || undefined,
      next_of_kin_relationship: next_of_kin_relationship || undefined,
      kyc_status: 'verified',
      updated_at: new Date().toISOString(),
    };

    if (role === 'TENANT') {
      bioDataPayload.employment_status = employment_status;
      bioDataPayload.employer_name = employer_name;
      bioDataPayload.monthly_income_range = monthly_income_range;
    } else if (role === 'LANDLORD' || role === 'ADMIN') {
      bioDataPayload.business_name = business_name;
      bioDataPayload.cac_number = cac_number;
    }

    // Clean undefined values
    Object.keys(bioDataPayload).forEach((k) => {
      if (bioDataPayload[k] === undefined) delete bioDataPayload[k];
    });

    const { error: bioDataError } = await supabaseAdminClient
      .from('user_biodata')
      .upsert(bioDataPayload, { onConflict: 'id' });

    if (bioDataError) {
      console.error('[submit-biodata] Biodata upsert error:', bioDataError.message);
      throw bioDataError;
    }

    // 4. Update bank details & Create Subaccount if landlord
    if ((role === 'LANDLORD' || role === 'ADMIN') && bank_name && account_number && account_name && bank_code) {
      // Upsert bank details
      const { data: bankData, error: bankError } = await supabaseAdminClient
        .from('bank_accounts')
        .upsert({
          user_id: userId,
          bank_name,
          account_number,
          account_name,
          bank_code,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
        .select()
        .single();
      
      if (bankError) {
        console.error('[submit-biodata] Bank account error:', bankError.message);
      }

      // Create Paystack Subaccount
      try {
        const finalBusinessName = business_name || `${resolvedFirstName} ${resolvedLastName}`.trim() || 'EdenHome Landlord';
        
        const paystackRes = await fetch('https://api.paystack.co/subaccount', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            business_name: finalBusinessName,
            settlement_bank: bank_code,
            account_number: account_number,
            percentage_charge: 3,
          }),
        });

        const paystackData = await paystackRes.json();

        if (paystackData.status && bankData?.id) {
          await supabaseAdminClient
            .from('payment_accounts')
            .upsert({
              user_id: userId,
              bank_account_id: bankData.id,
              paystack_subaccount_code: paystackData.data.subaccount_code,
            }, { onConflict: 'user_id' });
        }
      } catch (e: any) {
        console.error('[submit-biodata] Paystack Subaccount Error:', e.message);
      }
    }

    // 5. Update public.users `completed_biodata`, legal names, and verification flags via Admin Client
    const userUpsertPayload: any = {
      id: userId,
      email: user.email,
      role: role,
      completed_biodata: true,
      is_verified: true,
      is_nin_verified: true,
      updated_at: new Date().toISOString(),
    };

    if (resolvedFirstName) userUpsertPayload.first_name = resolvedFirstName;
    if (resolvedLastName) userUpsertPayload.last_name = resolvedLastName;

    const { error: userUpsertError } = await supabaseAdminClient
      .from('users')
      .upsert(userUpsertPayload, { onConflict: 'id' });

    if (userUpsertError) {
      console.warn('[submit-biodata] Upsert notice on public.users, falling back to update:', userUpsertError.message);
      const { error: updateError } = await supabaseAdminClient
        .from('users')
        .update(userUpsertPayload)
        .eq('id', userId);

      if (updateError) {
        console.error('[submit-biodata] Failed to update public.users:', updateError.message);
        throw updateError;
      }
    }

    // 6. Update auth.users metadata via Admin Client
    try {
      await supabaseAdminClient.auth.admin.updateUserById(
        userId,
        {
          user_metadata: {
            ...user.user_metadata,
            completed_biodata: true,
            firstName: resolvedFirstName || user.user_metadata?.firstName,
            lastName: resolvedLastName || user.user_metadata?.lastName,
            first_name: resolvedFirstName || user.user_metadata?.first_name,
            last_name: resolvedLastName || user.user_metadata?.last_name,
            is_verified: true,
            is_nin_verified: true,
          }
        }
      );
    } catch (authAdminErr: any) {
      console.warn('[submit-biodata] auth.admin.updateUserById notice:', authAdminErr.message);
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Registration and biodata setup completed successfully.',
      data: {
        first_name: resolvedFirstName,
        last_name: resolvedLastName,
        completed_biodata: true,
        is_verified: true,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('[submit-biodata] Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
