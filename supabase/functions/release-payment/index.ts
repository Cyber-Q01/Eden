// release-payment (v2 — self-verifying, no webhook dependency to release)
//
// What this does when the tenant confirms (Trigger A):
//   1. Guard: a rental with an existing pending/success payout is never
//      transferred again (double-payment protection, checked twice — here
//      and by the DB unique index on active payouts per rental)
//   2. Creates the payouts ledger row (pending) BEFORE the transfer
//   3. Initiates the Paystack transfer to the owner's recipient
//   4. VERIFIES the transfer itself via GET /transfer/verify/{reference}
//      (official Paystack endpoint): test transfers come back success
//      immediately; live transfers may stay queued, so we poll ~30s
//   5. On success: payout -> success, rental -> released, both parties
//      notified — all inside this function. If the transfer is still
//      queued after the poll window (live mode), the payout stays pending
//      and the fixed paystack-webhook (transfer.success) finishes the job.
//
// Deploy: dashboard editor, same as before. No new env vars.
// Companion SQL (run once in SQL Editor):
//   supabase/migrations/20260828010000_payout_active_unique.sql

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

const PAYSTACK_BASE = 'https://api.paystack.co';
const VERIFY_ATTEMPTS = 6;
const VERIFY_DELAY_MS = 5000;

function createAdminClient() {
    return createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
}

async function paystackRequest(
    path: string,
    method: 'GET' | 'POST' = 'GET',
    body?: Record<string, unknown>
) {
    const secretKey = Deno.env.get('PAYSTACK_SECRET_KEY') ?? '';
    const res = await fetch(`${PAYSTACK_BASE}${path}`, {
        method,
        headers: {
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json();
    if (!json.status) throw new Error(json.message ?? 'Paystack request failed');
    return json.data;
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

async function createNotification(
    admin: ReturnType<typeof createAdminClient>,
    userId: string,
    type: string,
    title: string,
    message: string,
    data: Record<string, unknown> = {}
) {
    try {
        const { error } = await admin.from('notifications').insert({
            user_id: userId,
            type,
            title,
            message,
            data,
        });
        if (error) console.error('Notification insert error:', error.message);
    } catch (e: any) {
        console.error('Notification error:', e.message);
    }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        const { rental_id } = await req.json();
        if (!rental_id) return errorResponse('Missing rental_id');

        const admin = createAdminClient();

        // ── Fetch rental ─────────────────────────────────────────────────
        const { data: rental, error: rentalError } = await admin
            .from('rentals')
            .select('*')
            .eq('id', rental_id)
            .single();

        if (rentalError || !rental) {
            console.error('Rental fetch error:', rentalError?.message);
            return errorResponse('Rental not found', 404);
        }

        // ── Already released ─────────────────────────────────────────────
        if (rental.status === 'released') {
            console.log('Already released — skipping');
            return jsonResponse({ success: true, already_released: true, released: true });
        }

        // ── Check for existing active payout (prevent double transfer) ──
        // limit(1): the table can hold several failed attempts per rental,
        // and .maybeSingle() would error on >1 rows instead of seeing the
        // active one.
        const { data: existingPayout } = await admin
            .from('payouts')
            .select('id, status, transfer_reference')
            .eq('rental_id', rental_id)
            .in('status', ['pending', 'success'])
            .limit(1)
            .maybeSingle();

        if (existingPayout) {
            console.log('Payout already exists:', existingPayout.id, '| Status:', existingPayout.status);
            // A successful payout means the money already moved — make sure
            // the rental is marked released (self-heal for webhook lag).
            if (existingPayout.status === 'success' && rental.status !== 'released') {
                await admin
                    .from('rentals')
                    .update({
                        status: 'released',
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', rental_id);
            }
            return jsonResponse({
                success: true,
                already_initiated: true,
                released: existingPayout.status === 'success',
                payout_id: existingPayout.id,
                transfer_reference: existingPayout.transfer_reference,
            });
        }

        // ── Fetch owner bank account (metadata only) ─────────────────────
        const { data: bankAccount } = await admin
            .from('bank_accounts')
            .select('bank_name, account_number, account_name')
            .eq('user_id', rental.owner_id)
            .maybeSingle();

        // ── Fetch owner's Paystack recipient (payment_accounts is the
        //     source of truth — that is where the recipient lives in prod)
        const { data: paymentAccount, error: paymentAccountError } = await admin
            .from('payment_accounts')
            .select('paystack_recipient_code')
            .eq('user_id', rental.owner_id)
            .single();

        if (paymentAccountError || !paymentAccount || !paymentAccount.paystack_recipient_code) {
            console.error('Payment account error:', paymentAccountError?.message);
            return errorResponse('Owner has no Paystack recipient code setup. Please have them update their bank details.', 400);
        }

        const transferRef = `TRF-${rental_id}-${Date.now()}`;
        const amountInKobo = rental.owner_payout * 100;

        console.log('Initiating transfer:', transferRef, '| Amount (kobo):', amountInKobo);

        // ── Create payout record BEFORE initiating transfer ──────────────
        // This ensures we have a record even if something crashes mid-transfer.
        // The partial unique index (one active payout per rental) is the hard
        // double-tap guard: a concurrent second request fails here.
        const { data: payout, error: payoutInsertError } = await admin
            .from('payouts')
            .insert({
                rental_id: rental.id,
                owner_id: rental.owner_id,
                amount: rental.owner_payout,
                platform_fee: rental.platform_fee,
                transfer_reference: transferRef,
                paystack_recipient_code: paymentAccount.paystack_recipient_code,
                status: 'pending',
                metadata: {
                    property_id: rental.property_id,
                    renter_id: rental.renter_id,
                    bank_name: bankAccount?.bank_name ?? null,
                    account_number: bankAccount?.account_number ?? null,
                    account_name: bankAccount?.account_name ?? null,
                    rental_amount: rental.amount,
                },
            })
            .select()
            .single();

        if (payoutInsertError) {
            console.error('Failed to create payout record:', payoutInsertError.message);
            return errorResponse('Failed to create payout record', 500);
        }

        console.log('✅ Payout record created:', payout.id);

        // ── Initiate Paystack transfer ───────────────────────────────────
        let transferData;
        try {
            transferData = await paystackRequest('/transfer', 'POST', {
                source: 'balance',
                amount: amountInKobo,
                recipient: paymentAccount.paystack_recipient_code,
                reference: transferRef,
                reason: `EdenHome rent payout — rental ${rental_id}`,
            });

            console.log('✅ Paystack transfer initiated:', transferData.transfer_code, '| status:', transferData.status);

        } catch (transferError: any) {
            console.error('❌ Paystack transfer failed:', transferError.message);

            // ── Mark payout as failed ──────────────────────────────────────
            await admin
                .from('payouts')
                .update({
                    status: 'failed',
                    metadata: {
                        ...payout.metadata,
                        failure_reason: transferError.message,
                        failed_at: new Date().toISOString(),
                    },
                })
                .eq('id', payout.id);

            await createNotification(
                admin,
                rental.owner_id,
                'system',
                '⚠️ Transfer Failed',
                'Your funds transfer failed. Our support team will retry shortly.',
                { rental_id: rental.id, transfer_reference: transferRef },
            );

            return errorResponse(`Transfer failed: ${transferError.message}`, 400);
        }

        // ── Update payout record with transfer code ──────────────────────
        await admin
            .from('payouts')
            .update({
                transfer_code: transferData.transfer_code,
                status: 'pending',
            })
            .eq('id', payout.id);

        // ── Verify the transfer (official endpoint:
        //     GET /transfer/verify/{reference} — test transfers return
        //     success immediately; live transfers may be queued) ──────────
        let finalStatus: string = transferData.status ?? 'pending';
        let verifyFailures: unknown = null;
        if (finalStatus !== 'success' && finalStatus !== 'failed') {
            for (let attempt = 1; attempt <= VERIFY_ATTEMPTS && finalStatus === 'pending'; attempt++) {
                await sleep(VERIFY_DELAY_MS);
                try {
                    const verified = await paystackRequest(`/transfer/verify/${transferRef}`);
                    finalStatus = verified.status ?? 'pending';
                    verifyFailures = verified.failures ?? null;
                    console.log(`Verify attempt ${attempt}: status = ${finalStatus}`);
                } catch (verifyError: any) {
                    console.error(`Verify attempt ${attempt} error:`, verifyError.message);
                }
            }
        }
        console.log('Final transfer status:', finalStatus);

        // ── STILL PENDING (live-mode queue) ───────────────────────────────
        // Leave the ledger row pending; the fixed paystack-webhook
        // (transfer.success) flips payout -> success and rental -> released.
        if (finalStatus !== 'success' && finalStatus !== 'failed') {
            await admin
                .from('rentals')
                .update({
                    transfer_reference: transferData.transfer_code ?? transferRef,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', rental_id);

            return jsonResponse({
                success: true,
                released: false,
                processing: true,
                payout_id: payout.id,
                transfer_code: transferData.transfer_code,
                transfer_reference: transferRef,
                amount: rental.owner_payout,
                note: 'Transfer is being processed by Paystack. The escrow will mark this rental as released automatically once Paystack confirms it.',
            });
        }

        // ── FAILED ───────────────────────────────────────────────────────
        if (finalStatus === 'failed') {
            const failureReason =
                (Array.isArray(verifyFailures) && verifyFailures.length > 0
                    ? String(verifyFailures[0])
                    : (verifyFailures as any)?.message) || 'Transfer failed';

            await admin
                .from('payouts')
                .update({
                    status: 'failed',
                    metadata: {
                        ...payout.metadata,
                        failure_reason: String(failureReason).slice(0, 500),
                        failed_at: new Date().toISOString(),
                    },
                })
                .eq('id', payout.id);

            await createNotification(
                admin,
                rental.owner_id,
                'system',
                '⚠️ Transfer Failed',
                'Your funds transfer failed. Our support team will retry shortly.',
                { rental_id: rental.id, transfer_reference: transferRef, failure_reason: failureReason },
            );

            return errorResponse(`Transfer failed: ${failureReason}`, 400);
        }

        // ── SUCCESS ──────────────────────────────────────────────────────
        // Ledger row first, release second — the two can never drift apart.
        const { error: payoutUpdateError } = await admin
            .from('payouts')
            .update({
                status: 'success',
                completed_at: new Date().toISOString(),
            })
            .eq('id', payout.id);

        if (payoutUpdateError) {
            // Money already moved — do NOT retry the transfer. Flag loudly.
            console.error(
                `❌ TRANSFER SUCCEEDED (${transferRef}) but payout row update failed: ${payoutUpdateError.message} — backfill manually`,
            );
            return errorResponse('Payout ledger update failed — contact support', 500);
        }

        const { error: rentalUpdateError } = await admin
            .from('rentals')
            .update({
                status: 'released',
                transfer_reference: transferData.transfer_code ?? transferRef,
                updated_at: new Date().toISOString(),
            })
            .eq('id', rental_id);

        if (rentalUpdateError) {
            console.error('❌ Rental release update failed:', rentalUpdateError.message);
            return errorResponse('Rental status update failed — contact support', 500);
        }

        await admin
            .from('properties')
            .update({ status: 'taken' })
            .eq('id', rental.property_id);

        const payoutInMillions = (rental.owner_payout / 1000000).toFixed(2);

        await createNotification(
            admin,
            rental.owner_id,
            'payment_received',
            '🎉 Funds Released!',
            `Your ₦${payoutInMillions}M has been transferred to your bank account.`,
            { rental_id: rental.id, amount: rental.owner_payout, transfer_reference: transferRef },
        );

        await createNotification(
            admin,
            rental.renter_id,
            'system',
            '✅ Rental Complete!',
            'Your rental is confirmed and the owner has been paid. Welcome to your new home!',
            { rental_id: rental.id },
        );

        console.log('✅ Rental released + owner paid:', rental_id, '| transfer:', transferData.transfer_code);

        return jsonResponse({
            success: true,
            released: true,
            payout_id: payout.id,
            transfer_code: transferData.transfer_code,
            transfer_reference: transferRef,
            amount: rental.owner_payout,
        });

    } catch (e: any) {
        console.error('release-payment error:', e.message);
        return errorResponse(e.message, 400);
    }
});
