// send-ad-notification (v2 — the simple version)
//
// What it does on every scheduled run (default: every 15 minutes):
//   1. Find ONE active ad whose push_sent_at flag is still NULL
//      (oldest first, created within the last 30 days)
//   2. Set the flag (push_sent_at = now()) BEFORE sending, so an ad can
//      never be pushed twice
//   3. Push the ad to every opted-in user (push_token set +
//      push_notifications_enabled) via the Expo Push API in batches of 100
//      (Expo's max per request) — the only network work, and it never
//      touches Postgres in a loop
//
// There is NO secret, NO shared token, NO claim table, NO Postgres cron.
// Supabase SCHEDULES this function for you (its built-in scheduler via
// --cron at deploy), and the push_sent_at flag is what keeps sends
// exactly-once.
//
// Deploy (one command — note the --cron):
//   supabase functions deploy send-ad-notification --no-verify-jwt --cron "*/15 * * * *"
//   Dashboard alternative: Edge Functions -> send-ad-notification -> set the
//   cron schedule to */15 * * * *  (JWT verification must stay OFF for the
//   schedule to fire).
//
// Env (ONE variable, that's it):
//   EXPO_PUSH_ACCESS_TOKEN — the SAME Expo token your existing
//   send-push-notification function uses (Dashboard -> Edge Functions ->
//   send-push-notification -> Environment Variables).
//   (The other common env names are also accepted, just in case.)
//
// Manual trigger: after you add an ad, either wait for the next 15-minute
// tick, or press "Invoke" on this function in the dashboard to push it now.
//
// Retry a failed ad (the flag is set before sending, so there is no
// automatic retry — by design, keep it simple):
//   update public.advertisements set push_sent_at = null where id = '<ad uuid>';
//   the next run picks it up again.
//
// Check results:
//   select id, title, status, push_sent_at, push_users
//   from public.advertisements order by created_at desc limit 10;

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_ENDPOINT = 'https://expo.push.com/v1';
const BATCH_SIZE = 100; // Expo Push API accepts up to 100 notifications per request
const AD_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // only push ads created in the last 30 days

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    status,
  });

Deno.serve(async (_req) => {
  // No auth gate: Supabase's scheduler calls this, and the push_sent_at flag
  // makes repeated/manual calls harmless — each ad is only ever sent once.

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // 1) One unsent ad per run (oldest first).
    const { data: ads, error: adsError } = await admin
      .from('advertisements')
      .select('id, title, cta_text, media_url')
      .eq('status', 'active')
      .is('push_sent_at', null)
      .gt('created_at', new Date(Date.now() - AD_WINDOW_MS).toISOString())
      .order('created_at', { ascending: true })
      .limit(1);
    if (adsError) throw adsError;

    if (!ads || ads.length === 0) {
      return jsonResponse({ ok: true, sent: 0, reason: 'no ads waiting to be pushed' });
    }
    const ad = ads[0];

    // 2) Claim it — set the flag BEFORE sending so it can never be pushed twice.
    const { data: claimed, error: claimError } = await admin
      .from('advertisements')
      .update({ push_sent_at: new Date().toISOString() })
      .eq('id', ad.id)
      .is('push_sent_at', null)
      .select('id');
    if (claimError) throw claimError;
    if (!claimed || claimed.length === 0) {
      return jsonResponse({ ok: true, sent: 0, reason: 'another run already claimed this ad' });
    }

    // 3) Every opted-in user with a stored push token (one query).
    const { data: users, error: usersError } = await admin
      .from('users')
      .select('push_token')
      .not('push_token', 'is', null)
      .eq('push_notifications_enabled', true);
    if (usersError) throw usersError;

    const tokens = (users ?? []).map((u: any) => u.push_token).filter(Boolean);
    if (tokens.length === 0) {
      return jsonResponse({ ok: true, ad_id: ad.id, users: 0, delivered: 0 });
    }

    // 4) Batched fan-out to the Expo Push API (100 devices per request).
    const accessToken =
      Deno.env.get('EXPO_PUSH_ACCESS_TOKEN') ??
      Deno.env.get('EXPO_PUSH_TOKEN') ??
      Deno.env.get('EXPO_ACCESS_TOKEN') ??
      Deno.env.get('EXPO_NOTIFICATION_TOKEN') ??
      '';
    if (!accessToken) {
      // Reset the flag so the next run retries once the token is configured.
      await admin.from('advertisements').update({ push_sent_at: null }).eq('id', ad.id);
      throw new Error(
        'Expo push token not set. Set EXPO_PUSH_ACCESS_TOKEN on this function ' +
          '(copy the Expo token your send-push-notification function already uses).',
      );
    }

    const title = String(ad.title || 'Eden special offer').slice(0, 80);
    const body = String(ad.cta_text || 'Open Eden to see the latest offers.').slice(0, 200);
    const image =
      typeof ad.media_url === 'string' && ad.media_url.startsWith('http') ? ad.media_url : undefined;

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
            data: { sound: 'default', ad_id: ad.id },
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
        // One bad batch should not kill the whole run — keep sending the rest.
        rejected += chunk.length;
        console.warn(`[send-ad-notification] Expo batch ${i / BATCH_SIZE} failed: ${res.status} ${JSON.stringify(payload).slice(0, 300)}`);
      }
    }

    // 5) Record reach on the ad row itself (no log table needed).
    await admin.from('advertisements').update({ push_users: delivered }).eq('id', ad.id);

    console.log(`[send-ad-notification] pushed ad ${ad.id} ("${title}") to ${delivered}/${tokens.length} devices`);
    return jsonResponse({ ok: true, ad_id: ad.id, users: tokens.length, delivered, rejected });
  } catch (e: any) {
    console.error('[send-ad-notification] error:', e?.message || e);
    return jsonResponse({ error: String(e?.message || e) }, 500);
  }
});
