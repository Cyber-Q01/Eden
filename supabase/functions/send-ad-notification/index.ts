// send-ad-notification
// Fan-out worker for new-ad push notifications (called async by the
// Postgres cron function `queue_ad_pushes` via pg_net).
//
// Performance notes:
//   * Runs entirely outside Postgres — the DB only stores a log row per ad.
//   * Pushes are sent to the Expo Push API in batches of 100 (Expo's max),
//     so even 10,000 users = ~100 fast API calls, not 10,000 DB round-trips.
//   * Exactly-once: claims the ad row atomically via `claim_ad_push`;
//     stale/failed rows are retried by the cron (max 5 attempts).
//
// Deploy:  supabase functions deploy send-ad-notification --no-verify-jwt
//
// Required env (project or function level):
//   * AD_PUSH_SECRET — copy from: select value from public.ef_secrets
//     where key = 'ad_push_secret';  (this function is closed to everyone
//     else — only the Postgres cron function can call it)
//   * EXPO_PUSH_ACCESS_TOKEN — your Expo push access token, i.e. the SAME
//     token your existing send-push-notification function already uses.
//     Find it under: Dashboard -> Edge Functions -> send-push-notification
//     -> Environment Variables. (Common env names are all accepted below.)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-ad-push-secret',
};

const EXPO_PUSH_ENDPOINT = 'https://expo.push.com/v1';
const BATCH_SIZE = 100; // Expo Push API accepts up to 100 notifications per request

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  // Shared-secret gate — only the Postgres cron function (or you, from the
  // dashboard with the same secret) may trigger this worker.
  const expectedSecret = Deno.env.get('AD_PUSH_SECRET') ?? '';
  const providedSecret = req.headers.get('x-ad-push-secret') ?? '';
  if (!expectedSecret || providedSecret !== expectedSecret) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  try {
    const { ad_id } = await req.json().catch(() => ({}));
    if (!ad_id) {
      return jsonResponse({ error: 'ad_id is required' }, 400);
    }

    // Service client — only used for DB access inside this trusted worker.
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1) Atomic claim — if another run already claimed or finished this ad, stop here
    const { data: claim } = await admin.rpc('claim_ad_push', { p_ad_id: ad_id });
    if (!claim) {
      return jsonResponse({
        success: true,
        skipped: true,
        reason: 'already claimed, already sent, or out of retry attempts',
      });
    }

    // 2) Load the ad
    const { data: ad, error: adError } = await admin
      .from('advertisements')
      .select('id, title, cta_text, media_url, status')
      .eq('id', ad_id)
      .maybeSingle();
    if (adError) throw adError;

    if (!ad) {
      await admin
        .from('ad_push_log')
        .update({ status: 'sent', users_targeted: 0, error: 'ad row not found', updated_at: new Date().toISOString() })
        .eq('ad_id', ad_id);
      return jsonResponse({ success: true, sent: 0, reason: 'ad row not found' });
    }

    const title = String(ad.title || 'Eden special offer').slice(0, 80);
    const body = String(ad.cta_text || 'Open Eden to see the latest offers.').slice(0, 200);
    const image =
      typeof ad.media_url === 'string' && ad.media_url.startsWith('http') ? ad.media_url : undefined;

    // 3) All opted-in users with a stored push token
    const { data: users, error: usersError } = await admin
      .from('users')
      .select('id, push_token')
      .not('push_token', 'is', null)
      .eq('push_notifications_enabled', true);
    if (usersError) throw usersError;

    const tokens = (users || []).map((u: any) => u.push_token).filter(Boolean);

    if (tokens.length === 0) {
      await admin
        .from('ad_push_log')
        .update({ status: 'sent', users_targeted: 0, updated_at: new Date().toISOString() })
        .eq('ad_id', ad_id);
      return jsonResponse({ success: true, sent: 0, users: 0 });
    }

    // 4) Batched fan-out to the Expo Push API (the only network work — off the DB)
    // Accept the common env names so it works with the token you already have.
    const accessToken =
      Deno.env.get('EXPO_PUSH_ACCESS_TOKEN') ??
      Deno.env.get('EXPO_PUSH_TOKEN') ??
      Deno.env.get('EXPO_ACCESS_TOKEN') ??
      Deno.env.get('EXPO_NOTIFICATION_TOKEN') ??
      '';
    if (!accessToken) {
      // Leave row as 'sending' so the cron retries once the token is configured
      throw new Error(
        'Expo push token not set. Set EXPO_PUSH_ACCESS_TOKEN on this function ' +
          '(copy the Expo token your send-push-notification function already uses).'
      );
    }

    let delivered = 0;
    let rejected = 0;

    for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
      const chunk = tokens.slice(i, i + BATCH_SIZE);
      const res = await fetch(EXPO_PUSH_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          notifications: chunk.map((to: string) => ({
            to,
            sound: 'default',
            title: `📢 ${title}`,
            body,
            image,
            data: { sound: 'default', ad_id },
          })),
        }),
      });

      const payload: any = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(payload.data)) {
        for (const item of payload.data) {
          if (item?.id) delivered += 1;
          else rejected += 1;
        }
      } else {
        // One bad batch should not kill the whole run — keep sending the rest
        rejected += chunk.length;
        console.warn(`[send-ad-notification] Expo batch ${i / BATCH_SIZE} failed: ${res.status} ${JSON.stringify(payload).slice(0, 300)}`);
      }
    }

    // 5) Report outcome back to the log (only a total failure retries)
    const totalFailure = delivered === 0;
    await admin
      .from('ad_push_log')
      .update({
        status: totalFailure ? 'failed' : 'sent',
        users_targeted: tokens.length,
        users_delivered: delivered,
        error: rejected > 0 ? `${rejected} of ${tokens.length} notifications were rejected by Expo` : null,
        updated_at: new Date().toISOString(),
      })
      .eq('ad_id', ad_id);

    return jsonResponse({
      success: true,
      ad_id,
      users: tokens.length,
      delivered,
      rejected,
    });
  } catch (e: any) {
    // Leave the row as 'sending' — the cron function resurrects stale rows
    // (15 min) and re-fires them, up to 5 attempts.
    console.error('[send-ad-notification] error:', e?.message || e);
    return jsonResponse({ error: String(e?.message || e) }, 500);
  }
});
