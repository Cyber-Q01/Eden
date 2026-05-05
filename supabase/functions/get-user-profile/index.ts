import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') // Use service role for admin access

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: 'Server misconfiguration' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Auth check: ensure the requester is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: requester }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !requester) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Get parameters
    let body: any = {}
    try {
      body = await req.json()
    } catch (e) {
      // No body
    }

    const targetUserId = body.userId || new URL(req.url).searchParams.get('userId')

    if (!targetUserId) {
      return new Response(
        JSON.stringify({ error: 'Missing userId parameter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Fetch user basic info
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, role')
      .eq('id', targetUserId)
      .single()

    if (userError || !userData) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Fetch user biodata
    const { data: biodata, error: biodataError } = await supabase
      .from('user_biodata')
      .select('phone_number, profile_photo')
      .eq('id', targetUserId)
      .single()

    // Combine data
    const profile = {
      ...userData,
      phone_number: biodata?.phone_number || null,
      profile_photo: biodata?.profile_photo || null,
    }

    return new Response(JSON.stringify(profile), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
