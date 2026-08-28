import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

function parseImages(images: unknown): string[] {
  if (Array.isArray(images)) return images;
  if (typeof images === 'string') {
    try {
      const parsed = JSON.parse(images);
      return Array.isArray(parsed) ? parsed : [images];
    } catch {
      return images.length > 0 ? [images] : [];
    }
  }
  return [];
}

function createUserClient(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) throw new Error('Missing Authorization header');

  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  );
}

async function getUserId(req: Request): Promise<string> {
  const supabase = createUserClient(req);
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Unauthorized');
  return user.id;
}

function errorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function createAdminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createUserClient(req);
    const supabaseAdmin = createAdminClient();
    const userId = await getUserId(req);

    // ── GET: Fetch bank details or external bank data ───────────────────
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const action = url.searchParams.get('action');

      // Action: list_banks (from Paystack)
      if (action === 'list_banks') {
        const res = await fetch('https://api.paystack.co/bank?country=nigeria', {
          headers: { Authorization: `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}` }
        });
        const data = await res.json();
        return jsonResponse(data.data || []);
      }

      // Action: resolve (from Paystack)
      if (action === 'resolve') {
        const accountNumber = url.searchParams.get('account_number');
        const bankCode = url.searchParams.get('bank_code');
        const secretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
        const testBankCode = '001';
        // I have to change the bankCode fromm testBankcode to bankCode in prod 

        console.log(`[Resolve] Account: ${accountNumber}, Bank: ${bankCode}, SecretKey exists: ${!!secretKey}`);

        if (!accountNumber || !bankCode) {
          return errorResponse('Missing account_number or bank_code');
        }

        const res = await fetch(`https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${testBankCode}`, {
          headers: { Authorization: `Bearer ${secretKey}` }
        });

        const data = await res.json();
        console.log(`[Resolve] Paystack status: ${data.status}, message: ${data.message}`);

        if (!data.status) {
          return errorResponse(data.message || 'Could not resolve account', 400);
        }

        return jsonResponse(data.data);
      }

      // Default: Fetch saved bank details from DB
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') return errorResponse(error.message, 500);
      return jsonResponse(data ?? null);
    }

    // ── POST: Upsert bank details & Create Subaccount ──────────────────
    if (req.method === 'POST') {
      const { bank_name, account_number, account_name, bank_code } = await req.json();

      console.log(`[POST] Upserting bank for user: ${userId}, bank: ${bank_name}`);

      if (!bank_name || !account_number || !account_name || !bank_code) {
        return errorResponse('Missing required fields');
      }

      // 1. Upsert into bank_accounts
      const { data: bankData, error: bankError } = await supabase
        .from('bank_accounts')
        .upsert({
          user_id: userId,
          bank_name,
          account_number,
          account_name,
          bank_code,
        }, { onConflict: 'user_id' })
        .select()
        .single();

      if (bankError) {
        console.error('[POST] bank_accounts upsert error:', bankError);
        return errorResponse(`Database Error (bank_accounts): ${bankError.message}`, 500);
      }

      console.log('[POST] bank_accounts upsert success:', bankData.id);

      // 2. Fetch User Info for Paystack Subaccount
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', userId)
        .single();
      
      if (profileError) console.warn('[POST] Profile fetch error:', profileError);

      const { data: biodata } = await supabase
        .from('user_biodata')
        .select('business_name')
        .eq('id', userId)
        .single();

      const businessName = biodata?.business_name || `${profile?.first_name} ${profile?.last_name}` || 'EdenHome Landlord';
      console.log(`[POST] Creating subaccount for business: ${businessName}`);

      // 3. Create Paystack Subaccount (non-fatal — payouts use the transfer
      //    recipient, not split settlements)
      let subaccountCode: string | null = null;
      try {
        const secretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
        const paystackRes = await fetch('https://api.paystack.co/subaccount', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            business_name: businessName,
            settlement_bank: bank_code,
            account_number: account_number,
            percentage_charge: 3, // Taking 3% for EdenHome service fee
          }),
        });

        const paystackData = await paystackRes.json();
        console.log(`[POST] Paystack subaccount status: ${paystackData.status}`);

        if (paystackData.status) {
          subaccountCode = paystackData.data.subaccount_code;
          console.log(`[POST] Storing subaccount code: ${subaccountCode}`);
        } else {
          // e.g. re-saving the same account — subaccount already exists.
          // Non-fatal: transfers do not require a subaccount.
          console.warn('[POST] Paystack Subaccount Error (non-fatal):', paystackData.message);
        }
      } catch (e) {
        console.warn('[POST] Subaccount exception (non-fatal):', e.message);
      }

      // 4. Create Paystack Transfer Recipient — the code release-payment pays to (CRITICAL)
      let recipientCode: string | null = null;
      let recipientId: string | null = null;
      try {
        const secretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
        console.log('[POST] Creating transfer recipient...');
        const recipientRes = await fetch('https://api.paystack.co/transferrecipient', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'nuban',
            name: account_name,
            account_number: account_number,
            bank_code: bank_code,
            currency: 'NGN',
            metadata: {
              user_id: userId,
            }
          }),
        });

        const recipientData = await recipientRes.json();
        if (recipientData.status) {
          recipientCode = recipientData.data.recipient_code;
          recipientId = recipientData.data.recipient_id != null ? String(recipientData.data.recipient_id) : null;
          console.log(`[POST] Transfer recipient created: ${recipientCode}`);
        } else {
          console.error('[POST] Paystack Recipient Error:', recipientData.message);
        }
      } catch (e) {
        console.error('[POST] Recipient exception:', e.message);
      }

      // 5. Store the recipient code on the user's bank_accounts row — this is
      //    the source of truth for payouts (one row per user, updated in place).
      if (recipientCode) {
        const { error: baUpdateErr } = await supabaseAdmin
          .from('bank_accounts')
          .update({
            paystack_recipient_code: recipientCode,
            paystack_recipient_id: recipientId,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);
        if (baUpdateErr) console.error('[POST] bank_accounts recipient update error:', baUpdateErr.message);
      }

      // 6. Legacy sync: payment_accounts (only when a subaccount code exists —
      //    paystack_subaccount_code is NOT NULL there). Older readers still work.
      if (subaccountCode) {
        const { error: subError } = await supabaseAdmin
          .from('payment_accounts')
          .upsert({
            user_id: userId,
            bank_account_id: bankData.id,
            paystack_subaccount_code: subaccountCode,
            paystack_recipient_code: recipientCode,
          }, { onConflict: 'user_id' });

        if (subError) {
          console.error('[POST] payment_accounts upsert error:', subError);
        }
      }

      if (!recipientCode) {
        // Bank details ARE saved, but payouts to this account are not set up yet.
        return jsonResponse({
          success: true,
          recipient_created: false,
          message: 'Bank details saved, but your payout account could not be set up yet. Please save your bank details again, or contact support.',
        });
      }

      return jsonResponse({ success: true, recipient_created: true });
    }

    return errorResponse('Method not allowed', 405);
  } catch (e) {
    return errorResponse(e.message, 401);
  }
});
