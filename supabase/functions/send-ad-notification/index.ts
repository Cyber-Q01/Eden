// send-ad-notification (v2 — the simple version)
//
// What it does on every scheduled run (default: every 15 minutes):
//   1. Find ONE active ad whose push_sent_at flag is still NULL
//      (oldest first, created within the last 30 days)
//   2. Set the flag (push_sent_at = now()) BEFORE sending, so an ad can
//      never be pushed twice
//   3. Push the ad to every opted-in user (push_token set +
//      push_notifications_enabled) via the Expo Push API
//
// HOW IT TALKS TO EXPO — the same way your existing send-push-notification
// function does (verified against the official Expo server SDK source):
//   * Endpoint: https://exp.host/--/api/v2/push/send  (NO auth header needed
//     unless you enable "enhanced push security" on your Expo project)
//   * Batches: up to 100 notifications per request (JSON array), ~6 requests
//     in parallel, 429s retried with backoff — so 10,000 users = ~100 fast
//     API calls, zero per-user Postgres loops, all off the database.
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
// Env: NONE required.
//   Optional: EXPO_PUSH_ACCESS_TOKEN — only needed if you ever enable
//   "enhanced push security" on your Expo project (expo.dev -> your project
//   -> API keys). If it's set, it's sent as the Authorization header; if
//   it's not set, the calls go unauthenticated — exactly like your existing
//   push function.
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

const EXPO_SEND_ENDPOINT = 'https://exp.host/--/api/v2/push/send'; // same endpoint your send-push-notification uses
const BATCH_SIZE = 100; // Expo's max notifications per request (official SDK chunk limit)
const CONCURRENCY = 6; // parallel batch requests (official SDK default)
const AD_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // only push ads created in the last 30 days

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    status,
  });

// One batch request: up to 100 notifications, one JSON array.
// Retries twice on 429 (rate limit) with backoff, like the official SDK.
async function sendBatch(
  tokens: string[],
  headers: Record<string, string>,
  makeMessage: (to: string) => Record<string, unknown>,
): Promise<{ delivered: number; rejected: number }> {
  const body = JSON.stringify(tokens.map(makeMessage));
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(EXPO_SEND_ENDPOINT, {
      method: 'POST',
      headers,
      body,
    });
    if (res.status === 429 && attempt < 2) {
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
      continue;
    }
    const payload: any = await res.json().catch(() => null);
    if (!res.ok || payload === null) {
      console.warn(`[send-ad-notification] Expo batch failed: ${res.status} ${JSON.stringify(payload).slice(0, 300)}`);
      return { delivered: 0, rejected: tokens.length };
    }
    const tickets = Array.isArray(payload) ? payload : [payload];
    let delivered = 0;
    let rejected = 0;
    for (const ticket of tickets) {
      if (ticket?.status === 'ok') delivered += 1;
      else {
        rejected += 1;
        if (ticket?.details?.error) console.warn(`[send-ad-notification] ticket error: ${ticket.details.error} — ${ticket?.message || ''}`);
      }
    }
    return { delivered, rejected };
  }
  return { delivered: 0, rejected: tokens.length };
}

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

    // 4) Fan-out to Expo. Optional access token: only sent if configured
    //    (needed only if "enhanced push security" is enabled on the project).
    const accessToken =
      Deno.env.get('EXPO_PUSH_ACCESS_TOKEN') ??
      Deno.env.get('EXPO_PUSH_TOKEN') ??
      Deno.env.get('EXPO_ACCESS_TOKEN') ??
      Deno.env.get('EXPO_NOTIFICATION_TOKEN') ??
      '';
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

    const title = `📢 ${String(ad.title || 'Eden special offer').slice(0, 80)}`;
    const body = String(ad.cta_text || 'Open Eden to see the latest offers.').slice(0, 200);
    const image =
      typeof ad.media_url === 'string' && ad.media_url.startsWith('http') ? ad.media_url : undefined;

    const makeMessage = (to: string) => ({
      to,
      sound: 'default',
      title,
      body,
      ...(image ? { richContent: { image } } : {}),
      data: { sound: 'default', ad_id: ad.id },
    });

    let delivered = 0;
    let rejected = 0;
    const chunks: string[][] = [];
    for (let i = 0; i < tokens.length; i += BATCH_SIZE) chunks.push(tokens.slice(i, i + BATCH_SIZE));

    // Run batch requests ~6 at a time (official SDK concurrency default).
    for (let i = 0; i < chunks.length; i += CONCURRENCY) {
      const group = chunks.slice(i, i + CONCURRENCY);
      const results = await Promise.all(group.map((chunk) => sendBatch(chunk, headers, makeMessage)));
      for (const r of results) {
        delivered += r.delivered;
        rejected += r.rejected;
      }
    }

    // 5) Record reach on the ad row itself (no log table needed).
    await admin.from('advertisements').update({ push_users: delivered }).eq('id', ad.id);

    console.log(`[send-ad-notification] pushed ad ${ad.id} ("${ad.title}") to ${delivered}/${tokens.length} devices`);
    return jsonResponse({ ok: true, ad_id: ad.id, users: tokens.length, delivered, rejected });
  } catch (e: any) {
    console.error('[send-ad-notification] error:', e?.message || e);
    return jsonResponse({ error: String(e?.message || e) }, 500);
  }
});
