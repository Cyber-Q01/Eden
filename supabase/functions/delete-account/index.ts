// delete-account
// In-app "Delete My Account" endpoint (store requirement — both Google Play
// and Apple require a working in-app deletion mechanism; you hold NIN data).
//
// What it does (tombstone deletion):
//   1. DELETES all personal data + user-generated content:
//        - biodata (NIN, ID images, next of kin, income...)
//        - applications, favorites, support tickets & messages
//        - maintenance/complaint requests, conversations, messages
//        - notifications, AI usage data
//        - LANDLORDS/AGENTS: their listings, bank accounts, agent links
//   2. KEEPS (deliberately): rentals, payments, payouts, tenancy agreements
//        — financial/legal audit trail. Required for tax & escrow
//        compliance, so it cannot be destroyed. These rows remain
//        referenceable but point at the anonymized user (see step 3).
//   3. TOMBSTONES the identity (account is permanently unusable):
//        - users row: name/email/ID fields wiped + anonymized
//        - GoTrue user: email changed to a generated address and password
//          reset to a random 48-char value -> the old email+password no
//          longer works
//        - OAuth identities (Google / Apple / email) removed -> "Continue
//          with Google/Apple" can no longer match this person
//
// Deploy:  supabase functions deploy delete-account
//          (normal JWT verification — only the signed-in user can delete
//          their own account; no extra env vars needed)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });

// [table, user-column] pairs deleted for EVERY role.
const PERSONAL_DATA: Array<[string, string]> = [
  ['user_biodata', 'id'], // PK = users.id
  ['favorites', 'user_id'],
  ['property_applications', 'renter_id'], // tenant side
  ['maintenance_requests', 'tenant_id'],
  ['complaint_requests', 'user_id'],
  ['messages', 'user_id'],
  ['conversations', 'user_id'],
  ['notifications', 'user_id'],
  ['notification_queue', 'user_id'],
  ['ai_rate_limits', 'user_id'],
  ['ai_logs', 'user_id'],
  ['ai_cache', 'user_id'],
  ['property_views', 'user_id'],
  ['price_analyses', 'user_id'],
  ['credit_transactions', 'user_id'],
  ['user_credits', 'user_id'],
  ['subscriptions', 'user_id'],
  ['property_unlocks', 'user_id'],
];

// Extra tables deleted only for LANDLORD / AGENT roles.
const LANDLORD_DATA: Array<[string, string]> = [
  ['properties', 'landlord_id'],
  ['bank_accounts', 'user_id'],
  ['landlord_agents', 'user_id'],
  ['agent_property_assignments', 'agent_id'],
  ['property_applications', 'owner_id'], // applications they received
  ['support_tickets', 'user_id'],
  ['support_messages', 'user_id'],
];

// Support tables for tenants (named separately in prod).
const TENANT_SUPPORT: Array<[string, string]> = [
  ['support_tickets', 'user_id'],
  ['support_messages', 'user_id'],
];

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization') ?? '';
  const service = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  );

  // 1) Who is calling? (their own JWT)
  const { data: { user } } = await service.auth.getUser();
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);
  const userId = user.id;

  // 2) Confirm the profile row exists
  const { data: profile, error: profileErr } = await service
    .from('users')
    .select('id, email, role')
    .eq('id', userId)
    .maybeSingle();
  if (profileErr) return jsonResponse({ error: profileErr.message }, 500);
  if (!profile) return jsonResponse({ error: 'Profile not found' }, 404);

  // 3) Delete personal data (per-table, failures don't abort the rest)
  const targets = [...PERSONAL_DATA];
  if (profile.role === 'LANDLORD' || profile.role === 'AGENT') targets.push(...LANDLORD_DATA);
  else targets.push(...TENANT_SUPPORT);

  const deleted: string[] = [];
  const failed: string[] = [];
  await Promise.all(
    targets.map(async ([table, column]) => {
      const { error } = await service.from(table).delete().eq(column, userId);
      if (error) failed.push(`${table} (${error.message.slice(0, 80)})`);
      else deleted.push(table);
    }),
  );

  // 4) Delete OAuth identities (Google / Apple / email) so no sign-in method
  //    can ever match this person again. GoTrue admin REST.
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  let identitiesRemoved = 0;
  try {
    const { data: fullUser, error: idErr } = await service.auth.admin.getUserById(userId);
    if (!idErr && fullUser) {
      for (const identity of fullUser.identities ?? []) {
        const res = await fetch(`${supabaseUrl}/auth/v1/admin/identities/${identity.id}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
          },
        });
        if (res.ok || res.status === 404) identitiesRemoved += 1;
      }
    }
  } catch (e) {
    failed.push(`identities (${(e as Error).message.slice(0, 80)})`);
  }

  // 5) Tombstone the identity: generated email + random password, wipe PII.
  const tombstoneEmail = `deleted-${userId.replace(/-/g, '')}@deleted.eden.invalid`;
  try {
    await service.auth.admin.updateUserById(userId, {
      email: tombstoneEmail,
      password: randomHex(24), // 48 hex chars — unguessable, kills old password
    });
  } catch (e) {
    failed.push(`auth-update (${(e as Error).message.slice(0, 80)})`);
  }

  const { error: tombErr } = await service
    .from('users')
    .update({
      email: tombstoneEmail,
      first_name: 'Deleted',
      last_name: 'User',
      id_number: null,
      smile_job_id: null,
      push_token: null,
      is_verified: false,
      is_verified_renter: false,
    })
    .eq('id', userId);
  if (tombErr) failed.push(`users (${tombErr.message.slice(0, 80)})`);

  return jsonResponse({
    success: failed.length === 0,
    deleted,
    identities_removed: identitiesRemoved,
    kept: [
      'rentals',
      'payments',
      'payouts',
      'tenancy_agreements',
    ],
    kept_reason:
      'Financial and legal transaction records are retained (anonymized) as required for tax and escrow compliance. All personal identifiers were removed.',
    failed,
  });
});
