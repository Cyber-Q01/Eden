// supabase/functions/submit-application/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

async function createNotification(
    supabase: any,
    userId: string,
    type: string,
    title: string,
    message: string,
    data: Record<string, any> = {},
    actionUrl?: string
) {
    try {
        const { error } = await supabase
            .from('notifications')
            .insert({
                user_id: userId,
                type,
                title,
                message,
                data,
                action_url: actionUrl,
            })

        if (error) {
            console.error(`[Notification Error for ${userId}]:`, JSON.stringify(error))
        } else {
            console.log(`[Notification Success]: ${type} for user ${userId}`);
        }
    } catch (err) {
        console.error(`[Notification Exception for ${userId}]:`, err)
    }
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders, status: 204 })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

        if (!supabaseUrl || !supabaseKey) {
            console.error('[ENV ERROR]: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
            return new Response(
                JSON.stringify({ error: 'Server misconfiguration' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
            )
        }

        const supabase = createClient(supabaseUrl, supabaseKey)

        // ── Auth ──────────────────────────────────────────────────────────────
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Missing authorization header' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
            )
        }

        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: authError } = await supabase.auth.getUser(token)

        if (authError || !user) {
            console.error('[Auth Error]:', authError)
            return new Response(
                JSON.stringify({ error: 'Unauthorized', details: authError?.message }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
            )
        }

        console.log('[Auth Success]: user =', user.id)

        // Read body for both GET and POST
        let bodyData: any = {}
        try {
            const text = await req.text()
            if (text) {
                bodyData = JSON.parse(text)
            }
        } catch (e) {
            console.log('[Body parse]: no body or invalid JSON')
        }

        console.log('[Request]: method =', req.method, '| body =', bodyData)

        // ========================================================================
        // GET — Fetch applications
        // ========================================================================
        if (req.method === 'GET') {
            const role = bodyData.role

            // ── Tenant: own applications ──────────────────────────────────────────
            if (role === 'tenant') {
                console.log('[GET Tenant]: fetching applications for user =', user.id)

                const { data: applications, error } = await supabase
                    .from('property_applications')
                    .select(`
            id,
            property_id,
            renter_id,
            owner_id,
            move_in_date,
            message,
            status,
            created_at,
            updated_at,
            property:properties (
              id,
              title,
              location,
              type,
              price,
              images
            )
          `)
                    .eq('renter_id', user.id)
                    .order('created_at', { ascending: false })

                if (error) {
                    console.error('[GET Tenant Error]:', JSON.stringify(error))
                    return new Response(
                        JSON.stringify({
                            error: error.message,
                            code: error.code,
                            details: error.details,
                            hint: error.hint,
                        }),
                        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                    )
                }

                console.log('[GET Tenant Success]: count =', applications?.length)

                return new Response(JSON.stringify(applications ?? []), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                })
            }

            // ── Landlord: applications on their properties ───────────────────────────
            if (role === 'landlord') {
                console.log('[GET Landlord]: fetching applications for landlord =', user.id)

                const { data: applications, error } = await supabase
                    .from('property_applications')
                    .select(`
            id,
            property_id,
            renter_id,
            owner_id,
            move_in_date,
            message,
            status,
            created_at,
            updated_at,
            property:properties (
              id,
              title,
              location,
              type,
              price,
              images
            ),
            renter:users!property_applications_renter_id_fkey (
              id,
              first_name,
              last_name,
              email
            )
          `)
                    .eq('owner_id', user.id)
                    .order('created_at', { ascending: false })

                if (error) {
                    console.error('[GET Landlord Error]:', JSON.stringify(error))
                    return new Response(
                        JSON.stringify({
                            error: error.message,
                            code: error.code,
                            details: error.details,
                            hint: error.hint,
                        }),
                        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                    )
                }

                console.log('[GET Landlord Success]: count =', applications?.length)

                return new Response(JSON.stringify(applications ?? []), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                })
            }

            // ── Invalid role ──────────────────────────────────────────────────────
            return new Response(
                JSON.stringify({ error: 'Invalid or missing role. Use "tenant" or "landlord".' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        // ========================================================================
        // POST — Handle both list and submit actions
        // ========================================================================
        if (req.method === 'POST') {
            const { action, role, property_id, move_in_date, message } = bodyData

            // ✅ NEW: Check if this is a list request
            if (action === 'list') {
                // ── Tenant: own applications ──────────────────────────────────────────
                if (role === 'tenant') {
                    console.log('[POST List Tenant]: fetching applications for user =', user.id)

                    const { data: applications, error } = await supabase
                        .from('property_applications')
                        .select(`
              id,
              property_id,
              renter_id,
              owner_id,
              move_in_date,
              message,
              status,
              created_at,
              updated_at,
              property:properties (
                id,
                title,
                location,
                type,
                price,
                images
              )
            `)
                        .eq('renter_id', user.id)
                        .order('created_at', { ascending: false })

                    if (error) {
                        console.error('[POST List Tenant Error]:', JSON.stringify(error))
                        return new Response(
                            JSON.stringify({
                                error: error.message,
                                code: error.code,
                                details: error.details,
                                hint: error.hint,
                            }),
                            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                        )
                    }

                    console.log('[POST List Tenant Success]: count =', applications?.length)

                    return new Response(JSON.stringify(applications ?? []), {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                        status: 200,
                    })
                }

                // ── Landlord: applications on their properties ───────────────────────────
                if (role === 'landlord') {
                    console.log('[POST List Landlord]: fetching applications for landlord =', user.id)

                    const { data: applications, error } = await supabase
                        .from('property_applications')
                        .select(`
              id,
              property_id,
              renter_id,
              owner_id,
              move_in_date,
              message,
              status,
              created_at,
              updated_at,
              property:properties (
                id,
                title,
                location,
                type,
                price,
                images
              ),
              renter:users!property_applications_renter_id_fkey (
                id,
                first_name,
                last_name,
                email
              )
            `)
                        .eq('owner_id', user.id)
                        .order('created_at', { ascending: false })

                    if (error) {
                        console.error('[POST List Landlord Error]:', JSON.stringify(error))
                        return new Response(
                            JSON.stringify({
                                error: error.message,
                                code: error.code,
                                details: error.details,
                                hint: error.hint,
                            }),
                            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                        )
                    }

                    console.log('[POST List Landlord Success]: count =', applications?.length)

                    return new Response(JSON.stringify(applications ?? []), {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                        status: 200,
                    })
                }

                // ── Invalid role for list action ──────────────────────────────────────
                return new Response(
                    JSON.stringify({ error: 'Invalid or missing role for list action. Use "tenant" or "landlord".' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                )
            }

            // ✅ EXISTING: Submit application (when no action specified)
            console.log('[POST]: property_id =', property_id, '| move_in_date =', move_in_date)

            // ── Validate required fields ──────────────────────────────────────────
            if (!property_id || !move_in_date || !message) {
                console.log('[POST Validation]: Missing fields');
                return new Response(
                    JSON.stringify({
                        error: 'Missing required fields',
                        required: ['property_id', 'move_in_date', 'message'],
                        received: { property_id, move_in_date, message: !!message },
                    }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                )
            }
            console.log('[POST Validation]: Required fields present');

            // ── Validate message length ───────────────────────────────────────────
            const trimmedMessage = message.trim()
            let isStructured = false;
            let coverLetter = trimmedMessage;
            try {
                if (trimmedMessage.startsWith('{')) {
                    const parsed = JSON.parse(trimmedMessage);
                    if (parsed && parsed.__eden_v === 1) {
                        isStructured = true;
                        coverLetter = (parsed.cover_letter || '').trim();
                    }
                }
            } catch (e) {
                console.log('[POST Validation]: Failed to parse message as JSON, treating as plain text');
            }

            console.log('[POST Validation]: Message trimmed, length =', trimmedMessage.length, 'isStructured =', isStructured, 'coverLetter length =', coverLetter.length);

            if (isStructured) {
                if (coverLetter.length < 10) {
                    return new Response(
                        JSON.stringify({ error: 'Message must be at least 10 characters long' }),
                        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                    )
                }
                if (coverLetter.length > 3000) {
                    return new Response(
                        JSON.stringify({ error: 'Message must not exceed 3000 characters' }),
                        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                    )
                }
                if (trimmedMessage.length > 50000) {
                    return new Response(
                        JSON.stringify({ error: 'Total application data size is too large' }),
                        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                    )
                }
            } else {
                if (trimmedMessage.length < 10) {
                    console.log('[POST Validation]: Message too short');
                    return new Response(
                        JSON.stringify({ error: 'Message must be at least 10 characters long' }),
                        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                    )
                }

                if (trimmedMessage.length > 3000) {
                    console.log('[POST Validation]: Message too long');
                    return new Response(
                        JSON.stringify({ error: 'Message must not exceed 3000 characters' }),
                        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                    )
                }
            }
            console.log('[POST Validation]: Message length OK');

            // ── Validate move-in date ─────────────────────────────────────────────
            const moveInDate = new Date(move_in_date)
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            console.log('[POST Validation]: Date objects created');

            if (isNaN(moveInDate.getTime())) {
                return new Response(
                    JSON.stringify({ error: 'Invalid move-in date format' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                )
            }

            if (moveInDate < today) {
                return new Response(
                    JSON.stringify({ error: 'Move-in date must be today or in the future' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                )
            }

            const oneYearFromNow = new Date()
            oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1)
            if (moveInDate > oneYearFromNow) {
                return new Response(
                    JSON.stringify({ error: 'Move-in date cannot be more than 1 year in the future' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                )
            }
            console.log('[POST Validation]: Dates OK');

            // ✅ 1. Fetch user info (only what exists in users table)
            console.log('[POST]: fetching user info for ID =', user.id)

            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('id, first_name, last_name, email')
                .eq('id', user.id)
                .single()

            if (userError || !userData) {
                console.error('[User Fetch Error]:', JSON.stringify(userError))
                return new Response(
                    JSON.stringify({ error: `User not found in database: ${userError?.message || 'No record'}` }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                )
            }
            console.log('[POST]: user info fetched for', userData.email);

            // ✅ MEMBERSHIP CHECK SKIPPED FOR NOW

            // ── 2. Fetch property ─────────────────────────────────────────────────
            console.log('[POST]: fetching property =', property_id)

            const { data: property, error: propertyError } = await supabase
                .from('properties')
                .select('id, landlord_id, status, price, title, location')
                .eq('id', property_id)
                .single()

            if (propertyError || !property) {
                console.error('[Property Fetch Error]:', JSON.stringify(propertyError))
                return new Response(
                    JSON.stringify({ error: `Property not found or error: ${propertyError?.message || 'No record'}` }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
                )
            }
            console.log('[POST]: property fetched =', property.title);

            // ── Guard: cannot apply to own property ───────────────────────────────
            if (property.landlord_id === user.id) {
                return new Response(
                    JSON.stringify({ error: 'You cannot apply to your own property' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                )
            }

            // ── Guard: property must be available ─────────────────────────────────
            if (property.status !== 'available') {
                return new Response(
                    JSON.stringify({
                        error: 'This property is not available for applications',
                        current_status: property.status,
                    }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                )
            }

            // ✅ 3. Fetch landlord details (only what exists in users table)
            const { data: landlordData, error: landlordError } = await supabase
                .from('users')
                .select('id, first_name, last_name, email')
                .eq('id', property.landlord_id)
                .single()

            if (landlordError) {
                console.warn('[Landlord Fetch Warning]:', JSON.stringify(landlordError));
            }
            console.log('[POST]: landlord info fetched status =', !!landlordData);

            // ── 4. Check for duplicate application ───────────────────────────────
            console.log('[POST]: checking for existing application')

            const { data: existingApplication, error: existingError } = await supabase
                .from('property_applications')
                .select('id, status')
                .eq('property_id', property_id)
                .eq('renter_id', user.id)
                .maybeSingle()

            if (existingError) {
                console.error('[Duplicate Check Error]:', JSON.stringify(existingError));
                return new Response(
                    JSON.stringify({ 
                        error: 'Failed to check for existing applications',
                        details: existingError.message,
                        code: existingError.code
                    }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                )
            }
            console.log('[POST]: existing application check result =', !!existingApplication);

            if (existingApplication) {
                console.log('[POST]: application already exists, status =', existingApplication.status);
                if (existingApplication.status === 'pending') {
                    return new Response(
                        JSON.stringify({ 
                            error: 'You already have a pending application for this property',
                            status: 'pending',
                            application_id: existingApplication.id
                        }),
                        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                    )
                }
                if (existingApplication.status === 'accepted') {
                    return new Response(
                        JSON.stringify({ 
                            error: 'You already have an accepted application for this property',
                            status: 'accepted',
                            application_id: existingApplication.id
                        }),
                        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                    )
                }
                
                // If status is 'declined', we allow them to re-apply by deleting the old one
                console.log('[POST]: deleting previous declined application to allow re-apply');
                const { error: deleteError } = await supabase
                    .from('property_applications')
                    .delete()
                    .eq('id', existingApplication.id);
                
                if (deleteError) {
                    console.error('[Delete Old Application Error]:', JSON.stringify(deleteError));
                    // Proceed anyway, the insert might handle it or fail gracefully
                }
            }

            // ── 5. Insert application ─────────────────────────────────────────────
            console.log('[POST]: inserting application')

            const { data: application, error: applicationError } = await supabase
                .from('property_applications')
                .insert({
                    property_id,
                    renter_id: user.id,
                    owner_id: property.landlord_id,
                    move_in_date,
                    message: trimmedMessage,
                    status: 'pending',
                })
                .select(`
          id,
          property_id,
          renter_id,
          owner_id,
          move_in_date,
          message,
          status,
          created_at,
          updated_at,
          property:properties (
            id,
            title,
            location,
            type,
            price,
            images
          )
        `)
                .single()

            if (applicationError) {
                console.error('[Application Insert Error]:', JSON.stringify(applicationError))

                if (applicationError.code === '23505') {
                    return new Response(
                        JSON.stringify({ error: 'You have already applied to this property' }),
                        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                    )
                }

                return new Response(
                    JSON.stringify({
                        error: `Application Save Error: ${applicationError.message}`,
                        code: applicationError.code,
                        details: applicationError.details,
                    }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                )
            }

            console.log('[POST]: application created =', application.id)
            const tenantName = `${userData.first_name} ${userData.last_name}`

            // ✅ 6. Notify landlord
            console.log('[POST]: Creating notification for landlord =', property.landlord_id);
            await createNotification(
                supabase,
                property.landlord_id,
                'new_application',
                '🏠 New Rental Application',
                `${tenantName} has applied to rent "${property.title}".`,
                {
                    application_id: application.id,
                    property_id: property.id,
                    renter_id: user.id,
                    renter_name: tenantName,
                    screen: 'LandlordApplications'
                }
            )

            // ── 7. Notify tenant ──────────────────────────────────────────────────
            console.log('[POST]: Creating notification for tenant =', user.id);
            await createNotification(
                supabase,
                user.id,
                'new_application',
                '✅ Application Submitted',
                `Your application for "${property.title}" has been submitted.`,
                {
                    application_id: application.id,
                    property_id: property.id,
                    screen: 'MyApplications'
                }
            )

            return new Response(JSON.stringify(application), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 201,
            })
        }

        // ========================================================================
        // Method not allowed
        // ========================================================================
        return new Response(
            JSON.stringify({ error: `Method ${req.method} not allowed` }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
        )

    } catch (error: any) {
        console.error('[Unhandled Error]:', error)

        return new Response(
            JSON.stringify({
                error: error?.message ?? 'An unexpected error occurred',
                details: error?.toString(),
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            }
        )
    }
})