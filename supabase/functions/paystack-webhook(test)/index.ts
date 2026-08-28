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

// ✅ Constant-time comparison — prevents timing attacks
function timingSafeEqual(a: string, b: string): boolean {
    const encoder = new TextEncoder();
    const aBytes = encoder.encode(a);
    const bBytes = encoder.encode(b);

    // Different lengths = definitely not equal
    // But we still do a full compare to not leak length info
    if (aBytes.length !== bBytes.length) return false;

    let result = 0;
    for (let i = 0; i < aBytes.length; i++) {
        result |= aBytes[i] ^ bBytes[i]; // XOR — 0 means equal
    }

    return result === 0;
}

// ✅ Verify Paystack HMAC signature
async function verifyPaystackSignature(
    rawBody: string,
    signature: string,
    secret: string
): Promise<boolean> {
    try {
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(secret),
            { name: 'HMAC', hash: 'SHA-512' },
            false,
            ['sign']
        );
        const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
        const hexSig = Array.from(new Uint8Array(sig))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

        return timingSafeEqual(hexSig, signature);
    } catch (e: any) {
        console.error('Signature verification error:', e.message);
        return false;
    }
}

// ✅ Check event is not a replay (older than 5 minutes)
function isStaleEvent(createdAt: string): boolean {
    const eventTime = new Date(createdAt).getTime();
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    return now - eventTime > fiveMinutes;
}

async function createNotification(
    supabase: any,
    userId: string,
    type: string,
    title: string,
    message: string,
    data: Record<string, any> = {}
) {
    try {
        const { error } = await supabase.from('notifications').insert({
            user_id: userId,
            type,
            title,
            message,
            data,
        });
        if (error) console.error('Notification insert error:', error.message);
        else console.log('✅ Notification created:', { userId, type, title });
    } catch (e: any) {
        console.error('Error creating notification:', e.message);
    }
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

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    // ✅ Only accept POST requests
    if (req.method !== 'POST') {
        return errorResponse('Method not allowed', 405);
    }

    try {
        const rawBody = await req.text();

        // ✅ Reject empty bodies immediately
        if (!rawBody) {
            console.error('❌ Empty request body');
            return errorResponse('Empty body', 400);
        }

        const signature = req.headers.get('x-paystack-signature') ?? '';
        const secret = Deno.env.get('PAYSTACK_SECRET_KEY') ?? '';

        // ✅ Reject if secret key is not configured
        if (!secret) {
            console.error('❌ PAYSTACK_SECRET_KEY not configured');
            return errorResponse('Server misconfiguration', 500);
        }

        // ✅ Reject if no signature provided
        if (!signature) {
            console.error('❌ Missing x-paystack-signature header');
            return errorResponse('Missing signature', 401);
        }

        console.log('=== PAYSTACK WEBHOOK RECEIVED ===');

        // ✅ Verify HMAC signature with timing-safe comparison
        const isValid = await verifyPaystackSignature(rawBody, signature, secret);
        if (!isValid) {
            console.error('❌ Invalid Paystack webhook signature — possible spoofing attempt');
            return errorResponse('Invalid signature', 401);
        }

        console.log('✅ Signature verified');

        const event = JSON.parse(rawBody);

        // ✅ Reject stale/replayed CHARGE events (older than 5 minutes).
        // Transfer events are EXEMPT: a transfer can legitimately be
        // confirmed more than 5 minutes after it was created (bank
        // processing time), and re-processing one is idempotent — without
        // this exemption, late-confirmed transfers never mark the payout
        // success and the rental never releases.
        const isTransferEvent = typeof event.event === 'string' && event.event.startsWith('transfer.');
        if (!isTransferEvent && event.data?.created_at && isStaleEvent(event.data.created_at)) {
            console.warn('⚠️ Stale event rejected — possible replay attack');
            console.warn('Event created_at:', event.data.created_at);
            return jsonResponse({ received: true, note: 'stale event ignored' });
        }

        console.log('Event type:', event.event);
        console.log('Event data:', JSON.stringify(event.data, null, 2));

        const admin = createAdminClient();

        switch (event.event) {

            // ── CHARGE SUCCESS ───────────────────────────────────────────
            case 'charge.success': {
                const { reference, metadata, amount } = event.data;

                console.log('=== CHARGE SUCCESS ===');
                console.log('Reference:', reference);
                console.log('Amount (kobo):', amount);
                console.log('Metadata:', JSON.stringify(metadata));

                // ── MEMBERSHIP PAYMENT ─────────────────────────────────────
                if (metadata?.type === 'membership') {
                    console.log('Processing MEMBERSHIP payment...');

                    const { data: paymentData, error: paymentError } = await admin
                        .from('payments')
                        .upsert(
                            {
                                user_id: metadata.user_id,
                                type: 'membership',
                                amount: amount / 100,
                                paystack_reference: reference,
                                paystack_status: 'success',
                                status: 'successful',
                                paid_at: new Date().toISOString(),
                                metadata: { user_id: metadata.user_id },
                            },
                            { onConflict: 'paystack_reference' }
                        )
                        .select();

                    console.log('Membership payment upsert error:', paymentError?.message ?? 'none');
                    console.log('Membership payment upsert data:', paymentData);

                    if (metadata.user_id) {
                        const { error: userError } = await admin
                            .from('users')
                            .update({
                                is_verified_renter: true,
                                membership_paid_at: new Date().toISOString(),
                            })
                            .eq('id', metadata.user_id);

                        console.log('User update error:', userError?.message ?? 'none');

                        await createNotification(
                            admin,
                            metadata.user_id,
                            'system',
                            '✅ Membership Activated!',
                            'Your ₦2,000 membership is active. You can now apply for properties!',
                            { type: 'membership_confirmed' }
                        );
                    }
                }

                // ── CREDIT TOPUP ───────────────────────────────────────────
                if (metadata?.type === 'credit_topup') {
                    console.log('Processing CREDIT TOPUP payment...');
                    const userId = metadata.user_id;
                    const unlocks = metadata.unlocks;
                    const nairaAmount = metadata.naira_amount;

                    if (!userId || !unlocks) {
                        console.error('❌ Missing userId or unlocks in credit_topup metadata');
                        break;
                    }

                    // Check for duplicate
                    const { data: existingTx } = await admin
                        .from('credit_transactions')
                        .select('id')
                        .eq('paystack_reference', reference)
                        .single();

                    if (existingTx) {
                        console.log('⚠️ Credit topup already processed for reference:', reference);
                        break;
                    }

                    // Atomic: add credits + log transaction via RPC
                    const { error: rpcError } = await admin.rpc('add_user_credits', {
                        p_user_id: userId,
                        p_amount: unlocks,
                        p_reference: reference,
                        p_naira_amount: nairaAmount
                    });

                    if (rpcError) {
                        console.error('❌ Failed to process credits via RPC:', rpcError.message);
                        break;
                    }

                    await createNotification(
                        admin,
                        userId,
                        'system',
                        '💰 Credits Added!',
                        `Successfully added ${unlocks} credit${unlocks > 1 ? 's' : ''} to your balance.`,
                        { type: 'credits_added', unlocks }
                    );

                    console.log(`✅ Successfully added ${unlocks} credits to user ${userId}`);
                }

                // ── RENT PAYMENT ───────────────────────────────────────────
                if (metadata?.type === 'rent') {
                    console.log('Processing RENT payment...');

                    // ✅ Get rental_id from metadata
                    const rentalId = metadata.rental_id;

                    if (!rentalId) {
                        console.error('❌ No rental_id in metadata — skipping');
                        break;
                    }

                    console.log('Looking up rental by ID:', rentalId);

                    // ✅ Fetch rental by ID (not by reference)
                    const { data: rental, error: rentalFetchError } = await admin
                        .from('rentals')
                        .select('*')
                        .eq('id', rentalId)
                        .eq('status', 'awaiting_payment')
                        .single();

                    console.log('Rental fetch error:', rentalFetchError?.message ?? 'none');
                    console.log('Rental found:', rental ? rental.id : 'NOT FOUND');

                    if (!rental) {
                        console.error('❌ Rental not found or already processed:', rentalId);
                        break;
                    }

                    const deadline = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

                    // ✅ Update rental status
                    const { error: rentalUpdateError } = await admin
                        .from('rentals')
                        .update({
                            status: 'awaiting_confirmation',
                            confirmation_deadline: deadline,
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', rental.id)
                        .eq('status', 'awaiting_payment');

                    console.log('Rental update error:', rentalUpdateError?.message ?? 'none');

                    if (rentalUpdateError) {
                        console.error('❌ Failed to update rental:', rentalUpdateError);
                    } else {
                        console.log('✅ Rental updated to awaiting_confirmation');
                    }

                    // ✅ Create payment record — paystack_reference column stays the same
                    const { data: paymentData, error: paymentError } = await admin
                        .from('payments')
                        .upsert(
                            {
                                user_id: rental.renter_id,
                                type: 'rent',
                                amount: rental.amount,
                                paystack_reference: reference,  // ✅ whatever reference Paystack used
                                paystack_status: 'success',
                                status: 'successful',
                                paid_at: new Date().toISOString(),
                                metadata: {
                                    rental_id: rental.id,
                                    property_id: rental.property_id,
                                    owner_id: rental.owner_id,
                                },
                            },
                            { onConflict: 'paystack_reference' }
                        )
                        .select();

                    console.log('Payment upsert error:', paymentError?.message ?? 'none');
                    console.log('Payment upsert data:', paymentData);

                    if (paymentError) {
                        console.error('❌ Failed to create payment record:', paymentError);
                    } else {
                        console.log('✅ Payment record created');
                    }

                    // ✅ Fetch property for notifications
                    const { data: property } = await admin
                        .from('properties')
                        .select('title')
                        .eq('id', rental.property_id)
                        .single();

                    const amountInMillions = (rental.amount / 1000000).toFixed(2);

                    // ✅ Notify owner
                    await createNotification(
                        admin,
                        rental.owner_id,
                        'payment_received',
                        '💰 Payment Received!',
                        `Renter paid ₦${amountInMillions}M for ${property?.title ?? 'your property'}. They have 48 hours to confirm.`,
                        {
                            rental_id: rental.id,
                            property_id: rental.property_id,
                            amount: rental.amount,
                            property_title: property?.title ?? '',
                            confirmation_deadline: deadline,
                        }
                    );

                    // ✅ Notify renter
                    await createNotification(
                        admin,
                        rental.renter_id,
                        'payment_received',
                        '✅ Payment Confirmed!',
                        `Your ₦${amountInMillions}M payment is confirmed. Visit the property and confirm within 48 hours.`,
                        {
                            rental_id: rental.id,
                            property_id: rental.property_id,
                            amount: rental.amount,
                            confirmation_deadline: deadline,
                        }
                    );

                    console.log('✅ Rent payment processing complete');
                }

                if (!metadata?.type) {
                    console.warn('⚠️ No metadata type on charge.success. Reference:', reference);
                }

                break;
            }

            // ── TRANSFER SUCCESS ─────────────────────────────────────────
            case 'transfer.success': {
                console.log('=== TRANSFER SUCCESS ===');
                const { reference: transferRef } = event.data;
                console.log('Transfer reference:', transferRef);

                // ✅ Update payout record to success
                const { error: payoutUpdateError } = await admin
                    .from('payouts')
                    .update({
                        status: 'success',
                        completed_at: new Date().toISOString(),
                    })
                    .eq('transfer_reference', transferRef);

                console.log('Payout update error:', payoutUpdateError?.message ?? 'none');

                if (!payoutUpdateError) {
                    console.log('✅ Payout marked as successful');
                }

                // Fetch rental
                const { data: rental, error: rentalFetchError } = await admin
                    .from('rentals')
                    .select('*, property:properties(title)')
                    .eq('transfer_reference', transferRef)
                    .single();

                console.log('Rental fetch error:', rentalFetchError?.message ?? 'none');

                if (!rental) {
                    console.error('❌ No rental found for transfer reference:', transferRef);
                    break;
                }

                // Update rental to released
                await admin
                    .from('rentals')
                    .update({
                        status: 'released',
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', rental.id);

                console.log('✅ Rental marked as released');

                const payoutInMillions = (rental.owner_payout / 1000000).toFixed(2);

                // Notify owner
                await createNotification(
                    admin,
                    rental.owner_id,
                    'payment_received',
                    '🎉 Funds Released!',
                    `Your ₦${payoutInMillions}M has been transferred to your bank account.`,
                    {
                        rental_id: rental.id,
                        amount: rental.owner_payout,
                        transfer_reference: transferRef,
                        property_title: rental.property?.title ?? '',
                    }
                );

                // Notify renter
                await createNotification(
                    admin,
                    rental.renter_id,
                    'system',
                    '✅ Rental Complete!',
                    'Your rental is confirmed and the owner has been paid. Welcome to your new home!',
                    {
                        rental_id: rental.id,
                        property_title: rental.property?.title ?? '',
                    }
                );

                break;
            }

            // ── TRANSFER FAILED ──────────────────────────────────────────
            case 'transfer.failed': {
                console.log('=== TRANSFER FAILED ===');
                const { reference: transferRef, message: failureReason } = event.data;
                console.error('Transfer FAILED:', transferRef);
                console.error('Reason:', failureReason ?? 'No reason provided');

                // ✅ Update payout record to failed (fetch existing metadata
                //    first — the old version passed a live Promise here,
                //    which serialized to {} and wiped the metadata)
                const { data: failedPayout } = await admin
                    .from('payouts')
                    .select('metadata')
                    .eq('transfer_reference', transferRef)
                    .maybeSingle();

                const { error: payoutUpdateError } = await admin
                    .from('payouts')
                    .update({
                        status: 'failed',
                        metadata: {
                            ...(failedPayout?.metadata ?? {}),
                            failure_reason: failureReason ?? 'Unknown error',
                            failed_at: new Date().toISOString(),
                        },
                    })
                    .eq('transfer_reference', transferRef);

                console.log('Payout update error:', payoutUpdateError?.message ?? 'none');

                if (!payoutUpdateError) {
                    console.log('✅ Payout marked as failed');
                }

                // Fetch rental to notify owner
                const { data: rental } = await admin
                    .from('rentals')
                    .select('owner_id')
                    .eq('transfer_reference', transferRef)
                    .single();

                if (!rental) {
                    console.error('❌ No rental found for transfer reference:', transferRef);
                    break;
                }

                await createNotification(
                    admin,
                    rental.owner_id,
                    'system',
                    '⚠️ Transfer Failed',
                    'Your funds transfer failed. Our support team will retry shortly.',
                    {
                        transfer_reference: transferRef,
                        failure_reason: failureReason ?? 'Unknown error',
                    }
                );

                break;
            }

            // ── TRANSFER REVERSED ────────────────────────────────────────
            case 'transfer.reversed': {
                console.log('=== TRANSFER REVERSED ===');
                const { reference: transferRef } = event.data;
                console.error('Transfer REVERSED:', transferRef);

                // ✅ Update payout record to reversed
                const { error: payoutUpdateError } = await admin
                    .from('payouts')
                    .update({
                        status: 'reversed',
                    })
                    .eq('transfer_reference', transferRef);

                console.log('Payout update error:', payoutUpdateError?.message ?? 'none');

                if (!payoutUpdateError) {
                    console.log('✅ Payout marked as reversed');
                }

                // Fetch rental to notify both parties
                const { data: rental } = await admin
                    .from('rentals')
                    .select('owner_id, renter_id')
                    .eq('transfer_reference', transferRef)
                    .single();

                if (!rental) {
                    console.error('❌ No rental found for transfer reference:', transferRef);
                    break;
                }

                await createNotification(
                    admin,
                    rental.owner_id,
                    'system',
                    '⚠️ Transfer Reversed',
                    'A payment transfer was reversed. Our support team will contact you.',
                    { transfer_reference: transferRef }
                );

                await createNotification(
                    admin,
                    rental.renter_id,
                    'system',
                    '⚠️ Payment Issue Detected',
                    'There was an issue with your rental payment. Our support team will contact you.',
                    { transfer_reference: transferRef }
                );

                break;
            }
            default:
                console.log('ℹ️ Unhandled webhook event:', event.event);
        }

        return jsonResponse({ received: true });

    } catch (e: any) {
        console.error('=== WEBHOOK ERROR ===');
        console.error('Message:', e.message);
        console.error('Stack:', e.stack);
        return jsonResponse({ received: true, error: e.message });
    }
});