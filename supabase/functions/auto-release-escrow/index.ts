// auto-release-escrow
// Trigger B of your terms: escrow auto-releases to the landlord 48h after
// payment when the tenant neither confirms nor disputes.
//
// HOW IT FITS WITH PROD (safe-by-design):
//   * If your prod `release-payment`/`verify-rent-payment` already implement
//     Trigger B, this function is a NO-OP: it only touches rows whose
//     deadline passed at least 10 minutes ago AND that nobody updated in the
//     last 5 minutes (your prod flow updates `updated_at` immediately).
//   * Every release is an ATOMIC status claim — two systems can never both
//     "own" the same rental row, so double payout via this path is impossible.
//   * Payouts use the owner's Paystack recipient code (the same model your
//     `bank_accounts.paystack_recipient_code` + `payouts` tables use).
//   * Owners without a recipient code yet are skipped (left for the normal
//     flow / support) instead of failing.
//   * Recipient code is read from payment_accounts first (prod's
//     release-payment uses that table), falling back to bank_accounts.
//   * Rentals whose payout is already 'pending' (prod's transfer in flight,
//     awaiting the transfer.success webhook) are NEVER transferred again.
//   * A payout row is always written BEFORE the rental flips to released —
//     released and payouts can never drift apart via this path.
//
// Triggered every 15 minutes by Supabase's built-in scheduler.
//
// Deploy (one command — note the --cron):
//   supabase functions deploy auto-release-escrow --no-verify-jwt --cron "*/15 * * * *"
//   Dashboard alternative: Edge Functions -> auto-release-escrow -> set the
//   cron schedule to */15 * * * *  (JWT verification must stay OFF).
//
// Env (ONE variable):
//   PAYSTACK_SECRET_KEY — same key your other Paystack functions use.
//
// NOTE: with no auth gate, invoking this URL early simply runs the same job
// the schedule would run — it can ONLY release rentals whose 48h deadline
// has already passed (checked in the query), and each release is an atomic
// status claim, so nothing can be released early or paid out twice.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
};

const PAYSTACK_BASE = 'https://api.paystack.co';
const MAX_PER_RUN = 20;

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });

Deno.serve(async (_req) => {
  // No auth gate: Supabase's scheduler calls this, and the job is safe to
  // run anytime — it only touches rentals past their 48h deadline, with an
  // atomic status claim preventing double payout.

  const service = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
  const paystackKey = Deno.env.get('PAYSTACK_SECRET_KEY') ?? '';

  const summary = { scanned: 0, released: 0, failed: 0, skipped: 0, details: [] as Array<Record<string, unknown>> };
  const finish = () => {
    // Full detail for the logs; the JSON response stays minimal (this
    // endpoint is publicly reachable, so keep ids/references out of it).
    console.log('[auto-release-escrow] run summary:', JSON.stringify(summary));
    return jsonResponse({
      scanned: summary.scanned,
      released: summary.released,
      failed: summary.failed,
      skipped: summary.skipped,
    });
  };

  // Candidates (PostgREST or-filter: each top-level group is implicit AND):
  //  A) awaiting_confirmation, deadline > 10min past, untouched for > 5min
  //     (the 5-min quiet period keeps us clear of prod's own fast release path)
  //  B) 'confirmed' rows stuck with no payout for > 30min (retry after a
  //     failed transfer, e.g. Paystack outage during the original run)
  const iso = (minAgo: number) => new Date(Date.now() - minAgo * 60 * 1000).toISOString();
  const { data: candidates, error: candErr } = await service
    .from('rentals')
    .select('id, amount, platform_fee, owner_payout, renter_id, owner_id, paystack_reference, status, confirmation_deadline, updated_at')
    .or(
      `(status.eq.awaiting_confirmation,confirmation_deadline.lt.${iso(10)},updated_at.lt.${iso(5)}),(status.eq.confirmed,confirmation_deadline.lt.${iso(10)},updated_at.lt.${iso(30)})`,
    )
    .limit(MAX_PER_RUN);
  if (candErr) return jsonResponse({ error: candErr.message }, 500);
  summary.scanned = candidates?.length ?? 0;
  if (!candidates || candidates.length === 0) return finish();

  for (const rental of candidates) {
    const isStuckConfirmed = rental.status === 'confirmed';

    // A) Atomic claim — this row is now ours. If the update matches 0 rows
    //    (prod released it in the meantime), skip silently.
    const { data: claimed, error: claimErr } = await service
      .from('rentals')
      .update({ status: 'confirmed', updated_at: new Date().toISOString() })
      .eq('id', rental.id)
      .eq('status', 'awaiting_confirmation')
      .select('id');
    if (claimErr) {
      summary.failed += 1;
      summary.details.push({ rental: rental.id, step: 'claim', error: claimErr.message });
      continue;
    }
    if (!isStuckConfirmed && (!claimed || claimed.length === 0)) {
      summary.skipped += 1; // prod handled it between our scan and claim
      continue;
    }

    // B) Load the owner's payout details
    const { data: owner } = await service.from('users').select('email, first_name, last_name').eq('id', rental.owner_id).maybeSingle();
    // Recipient code lives in payment_accounts in prod (release-payment
    // reads it there) — check that first, fall back to bank_accounts.
    const { data: paymentAccount } = await service
      .from('payment_accounts')
      .select('paystack_recipient_code')
      .eq('user_id', rental.owner_id)
      .maybeSingle();
    const { data: bank } = await service.from('bank_accounts').select('paystack_recipient_code, bank_name, account_number').eq('user_id', rental.owner_id).maybeSingle();
    const recipientCode: string | null =
      paymentAccount?.paystack_recipient_code || bank?.paystack_recipient_code || null;

    if (!owner?.email || !recipientCode) {
      // No recipient on file — leave in 'confirmed' for the normal flow
      // (prod's create-owner-recipient / support path will complete it).
      summary.skipped += 1;
      summary.details.push({ rental: rental.id, step: 'skip', reason: !owner?.email ? 'owner email missing' : 'no paystack_recipient_code on file' });
      continue;
    }

    // B2) Self-heal: a payout already SUCCEEDED for this rental (a previous
    //     run paid the transfer but crashed before flipping the rental).
    //     NEVER transfer twice — just sync the rental to released.
    const { data: existingPayouts } = await service
      .from('payouts')
      .select('id, status, transfer_reference')
      .eq('rental_id', rental.id);
    const succeededPayout = (existingPayouts ?? []).find((p: any) => p.status === 'success');
    if (succeededPayout) {
      await service
        .from('rentals')
        .update({
          status: 'released',
          transfer_reference: succeededPayout.transfer_reference,
          updated_at: new Date().toISOString(),
        })
        .eq('id', rental.id);
      summary.released += 1;
      summary.details.push({ rental: rental.id, step: 'healed-already-paid', reference: succeededPayout.transfer_reference });
      continue;
    }

    const pendingPayout = (existingPayouts ?? []).find((p: any) => p.status === 'pending');
    if (pendingPayout) {
      // Prod's release-payment creates the payout BEFORE the transfer and
      // waits for the transfer.success webhook. That transfer is in flight —
      // do NOT send a second one. The webhook (or next run's heal above)
      // finishes the job.
      summary.skipped += 1;
      summary.details.push({ rental: rental.id, step: 'skip', reason: 'payout pending — transfer already in flight' });
      continue;
    }

    // C) Paystack transfer: initialize -> commit
    const kobo = Math.round(Number(rental.owner_payout ?? rental.amount) * 100);
    let transferRef = '';
    let transferCode: string | null = null;
    let transferError: string | null = null;
    try {
      const initRes = await fetch(`${PAYSTACK_BASE}/transfer/initialize`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${paystackKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: owner.email,
          amount: kobo,
          currency: 'NGN',
          recipient_code: recipientCode,
          reason: `Eden escrow payout — ${rental.paystack_reference}`,
        }),
      });
      const initData = await initRes.json();
      if (!initData.status) throw new Error(initData.message || 'transfer init failed');
      transferRef = initData.data.reference;

      const commitRes = await fetch(`${PAYSTACK_BASE}/transfer/${transferRef}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${paystackKey}` },
      });
      const commitData = await commitRes.json();
      if (!commitData.status) throw new Error(commitData.message || 'transfer commit failed');
      transferCode = commitData.data?.transfer_code ?? initData.data?.transfer_code ?? null;
    } catch (e) {
      transferError = (e as Error).message;
    }

    // D) Record the result
    if (transferError) {
      // Upsert (not insert): one ledger row per rental — repeated failed
      // attempts update the same row instead of piling up duplicates.
      await service.from('payouts').upsert(
        {
          rental_id: rental.id,
          owner_id: rental.owner_id,
          amount: Number(rental.owner_payout ?? rental.amount),
          platform_fee: Number(rental.platform_fee ?? 0),
          transfer_reference: transferRef || `failed-${rental.id}`,
          transfer_code: transferCode,
          paystack_recipient_code: recipientCode,
          status: 'failed',
          metadata: { source: 'auto-release-48h', error: transferError.slice(0, 500) },
        },
        { onConflict: 'rental_id' },
      );
      // Leave rental in 'confirmed' — set B retries on the next cron run.
      summary.failed += 1;
      summary.details.push({ rental: rental.id, step: 'transfer', error: transferError, reference: transferRef || null });
    } else {
      // Ledger row FIRST, release second — a rental must never be
      // 'released' without a payout row existing.
      const { error: payErr } = await service.from('payouts').upsert(
        {
          rental_id: rental.id,
          owner_id: rental.owner_id,
          amount: Number(rental.owner_payout ?? rental.amount),
          platform_fee: Number(rental.platform_fee ?? 0),
          transfer_reference: transferRef,
          transfer_code: transferCode,
          paystack_recipient_code: recipientCode,
          status: 'success',
          completed_at: new Date().toISOString(),
          metadata: { source: 'auto-release-48h' },
        },
        { onConflict: 'rental_id' },
      );
      if (payErr) {
        // Transfer DID go through — do NOT re-run it. Backfill the payouts
        // row manually (reference is in the error log below).
        console.error(
          `[auto-release-escrow] TRANSFER SUCCEEDED (${transferRef}) but payout row write failed for rental ${rental.id}: ${payErr.message} — backfill payouts manually, do NOT re-run the transfer`,
        );
        summary.failed += 1;
        summary.details.push({ rental: rental.id, step: 'record-payout', error: payErr.message, reference: transferRef });
        continue;
      }
      const { error: relErr } = await service
        .from('rentals')
        .update({ status: 'released', transfer_reference: transferRef, updated_at: new Date().toISOString() })
        .eq('id', rental.id)
        .eq('status', 'confirmed');
      if (relErr) {
        // Payout row is safe — next run's B2 heal flips the rental over.
        summary.failed += 1;
        summary.details.push({ rental: rental.id, step: 'record-release', error: relErr?.message });
      } else {
        summary.released += 1;
        summary.details.push({ rental: rental.id, step: 'released', reference: transferRef });
      }
    }
  }

  return finish();
});
