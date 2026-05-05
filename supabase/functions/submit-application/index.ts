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
            console.error('[Notification Error]:', JSON.stringify(error))
        }
    } catch (err) {
        console.error('[Notification Exception]:', err)
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
                try {
                    bodyData = JSON.parse(text)
                } catch (e) {
                    console.error('[Body parse ERROR]: invalid JSON', e)
                    return new Response(
                        JSON.stringify({ error: 'Invalid JSON body' }),
                        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                    )
                }
            }
        } catch (e) {
            console.log('[Body read]: no body')
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
                return new Response(
                    JSON.stringify({
                        error: 'Missing required fields',
                        required: ['property_id', 'move_in_date', 'message'],
                        received: { property_id, move_in_date, message: !!message },
                    }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                )
            }

            // ── Validate message length ───────────────────────────────────────────
            const trimmedMessage = message.trim()
            if (trimmedMessage.length < 10) {
                return new Response(
                    JSON.stringify({ error: 'Message must be at least 10 characters long' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                )
            }

            if (trimmedMessage.length > 1000) {
                return new Response(
                    JSON.stringify({ error: 'Message must not exceed 1000 characters' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                )
            }

            // ── Validate move-in date ─────────────────────────────────────────────
            const moveInDate = new Date(move_in_date)
            const today = new Date()
            today.setHours(0, 0, 0, 0)

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

            // ✅ 1. Fetch user info (only what exists in users table)
            console.log('[POST]: fetching user info =', user.id)

            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('id, first_name, last_name, email')
                .eq('id', user.id)
                .single()

            if (userError) {
                console.error('[User Fetch Error]:', JSON.stringify(userError))
                return new Response(
                    JSON.stringify({ error: 'Failed to fetch user data', details: userError.message }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                )
            }

            // ✅ MEMBERSHIP CHECK SKIPPED FOR NOW

            // ── 2. Fetch property ─────────────────────────────────────────────────
            console.log('[POST]: fetching property =', property_id)

            const { data: property, error: propertyError } = await supabase
                .from('properties')
                .select('id, landlord_id, status, price, title, location')
                .eq('id', property_id)
                .single()

            if (propertyError) {
                console.error('[Property Fetch Error]:', JSON.stringify(propertyError))
                return new Response(
                    JSON.stringify({ error: 'Property not found', details: propertyError.message }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
                )
            }

            if (!property) {
                return new Response(
                    JSON.stringify({ error: 'Property not found' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
                )
            }

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
            const { data: landlordData } = await supabase
                .from('users')
                .select('id, first_name, last_name, email')
                .eq('id', property.landlord_id)
                .single()

            // ── 4. Check for duplicate application ───────────────────────────────
            console.log('[POST]: checking for existing application')

            const { data: existingApplication } = await supabase
                .from('property_applications')
                .select('id, status')
                .eq('property_id', property_id)
                .eq('renter_id', user.id)
                .maybeSingle()

            if (existingApplication) {
                if (existingApplication.status === 'pending') {
                    return new Response(
                        JSON.stringify({ error: 'You already have a pending application for this property' }),
                        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                    )
                }
                if (existingApplication.status === 'accepted') {
                    return new Response(
                        JSON.stringify({ error: 'You already have an accepted application for this property' }),
                        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                    )
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
                        error: applicationError.message,
                        code: applicationError.code,
                        details: applicationError.details,
                    }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                )
            }

            console.log('[POST]: application created =', application.id)

            // ✅ 6. Notify landlord
            const tenantName = `${userData.first_name} ${userData.last_name}`

            await createNotification(
                supabase,
                property.landlord_id,
                'new_application',
                '🏠 New Rental Application',
                `${tenantName} has applied to rent "${property.title}". Move-in date: ${new Date(move_in_date).toLocaleDateString('en-NG')}.`,
                {
                    application_id: application.id,
                    property_id: property.id,
                    renter_id: user.id,
                    renter_name: tenantName,
                    renter_email: userData.email,
                    property_title: property.title,
                    move_in_date,
                },
                `/dashboard/applications/${application.id}`
            )

            // ── 7. Notify tenant ──────────────────────────────────────────────────
            await createNotification(
                supabase,
                user.id,
                'new_application',
                '✅ Application Submitted',
                `Your application for "${property.title}" has been submitted. The landlord will review it shortly.`,
                {
                    application_id: application.id,
                    property_id: property.id,
                    property_title: property.title,
                    landlord_name: landlordData
                        ? `${landlordData.first_name} ${landlordData.last_name}`
                        : 'Property Landlord',
                    move_in_date,
                },
                `/dashboard/my-applications/${application.id}`
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