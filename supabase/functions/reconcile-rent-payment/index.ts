// reconcile-rent-payment
//
// Purpose: finish the job for rentals stuck in `awaiting_payment` whose
// charge actually SUCCEEDED in Paystack — the app closed before the UI
// verified, or the charge.success webhook event was lost. (In the current
// architecture only the webhook advances these rows; when the event is
// missing, nothing else can move them. This function is that safety net.)
//
// Called by:
//   * the pg_cron sweep — second loop in the auto-release function, with
//     the service-role key, for every awaiting_payment row older than 48h
//   * manually — dashboard Invoke, body: { "reference": "RENT_..." }
//
// Safety model (no auth gate, same pattern as send-ad-notification):
//   * Paystack is the source of truth — nothing advances unless
//     transaction/verify/{reference} says the charge succeeded
//   * advances ONLY forward (awaiting_payment -> awaiting_confirmation),
//     and only atomically while the row is still awaiting_payment
//   * fully idempotent: already-advanced rows return a 200 no-op;
//     references that were never charged return 400 and change nothing
//     — so the cron can re-run it every tick with zero risk
//
// Env: PAYSTACK_SECRET_KEY (the same key your other Paystack functions use)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

function createAdminClient() {
    return createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
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

async function paystackVerify(reference: string) {
    const secretKey = Deno.env.get('PAYSTACK_SECRET_KEY') ?? '';
    const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
        headers: { Authorization: `Bearer ${secretKey}` },
    });
    const json = await res.json();
    if (!json.status) throw new Error(json.message ?? 'Verification failed');
    return json.data;
}

async function notify(
    admin: ReturnType<typeof createAdminClient>,
    userId: string,
    type: string,
    title: string,
    message: string,
    data: Record<string, unknown> = {},
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

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        const { reference } = await req.json();
        if (!reference) return errorResponse('Missing reference');

        const admin = createAdminClient();

        // 1) Paystack is the source of truth — check BEFORE touching the DB.
        //    A reference that was never charged throws here (400, no-op).
        const paystackData = await paystackVerify(reference);

        if (paystackData.status !== 'success') {
            return errorResponse(
                `Payment not successful in Paystack (status: ${paystackData.status})`,
            );
        }

        // 2) Find the rental for this charge reference
        const { data: rental } = await admin
            .from('rentals')
            .select('*')
            .eq('paystack_reference', reference)
            .maybeSingle();

        if (!rental) {
            return errorResponse('No rental found for this reference', 404);
        }

        // 3) Idempotency: already advanced (or finished) -> no-op
        if (rental.status !== 'awaiting_payment') {
            return jsonResponse({
                ok: true,
                already_advanced: true,
                status: rental.status,
                rental_id: rental.id,
            });
        }

        // 4) Atomic forward move: awaiting_payment -> awaiting_confirmation
        //    (the 48h clock starts now; your release cron handles the rest)
        const deadline = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
        const { data: updated, error: updateError } = await admin
            .from('rentals')
            .update({
                status: 'awaiting_confirmation',
                confirmation_deadline: deadline,
                updated_at: new Date().toISOString(),
            })
            .eq('id', rental.id)
            .eq('status', 'awaiting_payment')
            .select('id');

        if (updateError || !updated || updated.length === 0) {
            return errorResponse(
                `Could not advance rental: ${updateError?.message ?? 'no rows updated'}`,
                500,
            );
        }

        // 5) Payments ledger row (idempotent — same upsert the webhook uses)
        await admin
            .from('payments')
            .upsert(
                {
                    user_id: rental.renter_id,
                    type: 'rent',
                    amount: rental.amount,
                    paystack_reference: reference,
                    paystack_status: 'success',
                    status: 'successful',
                    paid_at: new Date().toISOString(),
                    metadata: {
                        rental_id: rental.id,
                        property_id: rental.property_id,
                        owner_id: rental.owner_id,
                        reconciled: true,
                    },
                },
                { onConflict: 'paystack_reference' },
            );

        // 6) Notify both parties (best effort)
        const { data: property } = await admin
            .from('properties')
            .select('title')
            .eq('id', rental.property_id)
            .maybeSingle();

        const amountInMillions = (rental.amount / 1000000).toFixed(2);
        await notify(
            admin,
            rental.owner_id,
            'payment_received',
            '💰 Payment Received!',
            `Renter paid ₦${amountInMillions}M for ${property?.title ?? 'your property'}. They have 48 hours to confirm.`,
            { rental_id: rental.id },
        );
        await notify(
            admin,
            rental.renter_id,
            'payment_received',
            '✅ Payment Confirmed!',
            'Your payment is confirmed. Visit the property and confirm within 48 hours.',
            { rental_id: rental.id },
        );

        console.log(`[reconcile-rent-payment] advanced rental ${rental.id} (reference ${reference})`);
        return jsonResponse({
            ok: true,
            advanced: true,
            rental_id: rental.id,
            confirmation_deadline: deadline,
        });
    } catch (e: any) {
        console.error('reconcile-rent-payment error:', e?.message);
        return errorResponse(e?.message ?? 'reconcile failed', 400);
    }
});
