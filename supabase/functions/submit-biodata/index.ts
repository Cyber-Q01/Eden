import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// Create admin client to bypass RLS for user metadata update
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

    // 2. Parse payload
    const body = await req.json();
    const {
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
      // Landlord specific
      // Landlord specific
      business_name,
      cac_number,
      bank_name,
      account_number,
      account_name,
      bank_code
    } = body;

    // 3. Insert/Update Bio Data
    const bioDataPayload: any = {
      id: userId,
      phone_number,
      dob,
      gender,
      profile_photo,
      id_type,
      id_number,
      id_front_image,
      id_back_image,
      next_of_kin_name,
      next_of_kin_phone,
      next_of_kin_relationship,
    };

    if (role === 'TENANT') {
      bioDataPayload.employment_status = employment_status;
      bioDataPayload.employer_name = employer_name;
      bioDataPayload.monthly_income_range = monthly_income_range;
    } else if (role === 'LANDLORD' || role === 'ADMIN') {
      bioDataPayload.business_name = business_name;
      bioDataPayload.cac_number = cac_number;
    }

    const { error: bioDataError } = await supabaseUserClient
      .from('user_biodata')
      .upsert(bioDataPayload);

    if (bioDataError) throw bioDataError;

    // 4. Update bank details & Create Subaccount if landlord
    if ((role === 'LANDLORD' || role === 'ADMIN') && bank_name && account_number && account_name && bank_code) {
      // Upsert bank details
      const { data: bankData, error: bankError } = await supabaseUserClient
        .from('bank_accounts')
        .upsert({
          user_id: userId,
          bank_name,
          account_number,
          account_name,
          bank_code
        })
        .select()
        .single();
      
      if (bankError) throw bankError;

      // Create Paystack Subaccount
      try {
        const finalBusinessName = business_name || `${user.user_metadata?.firstName} ${user.user_metadata?.lastName}` || 'EdenHome Landlord';
        
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

        if (paystackData.status) {
          await supabaseAdminClient
            .from('payment_accounts')
            .upsert({
              user_id: userId,
              bank_account_id: bankData.id,
              paystack_subaccount_code: paystackData.data.subaccount_code,
            }, { onConflict: 'user_id' });
        }
      } catch (e) {
        console.error('Paystack Subaccount Error during onboarding:', e.message);
      }
    }

    // 5. Update public.users `completed_biodata` column
    const { error: updateError } = await supabaseUserClient
      .from('users')
      .update({ completed_biodata: true })
      .eq('id', userId);

    if (updateError) throw updateError;

    // 6. Update auth.users metadata via Admin Client
    const { error: adminUpdateError } = await supabaseAdminClient.auth.admin.updateUserById(
      userId,
      { user_metadata: { ...user.user_metadata, completed_biodata: true } }
    );

    if (adminUpdateError) throw adminUpdateError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
