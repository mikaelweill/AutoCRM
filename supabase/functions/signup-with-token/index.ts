import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

interface RequestBody {
  email: string
  password: string
  token: string
}

interface ResponseBody {
  error?: string
  user?: any
}

// Extended Request interface to include all needed properties
interface Request {
  method: string
  json: () => Promise<any>
  headers: Headers
  url: string
}

// Create a Supabase client with admin privileges
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// List of allowed origins
const allowedOrigins = [
  'http://localhost:3001',
  'https://auto-crm-agent.vercel.app',
  Deno.env.get('PROD_URL'),
].filter(Boolean) // Remove any undefined values

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // We'll validate the origin in the handler
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

serve(async (req: Request) => {
  // Handle CORS with origin validation
  const origin = req.headers.get('origin')
  if (origin) {
    if (allowedOrigins.includes(origin)) {
      corsHeaders['Access-Control-Allow-Origin'] = origin
    } else {
      return new Response('Not allowed', { status: 403 })
    }
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Log full request details
    console.log('Full request details:', {
      method: req.method,
      headers: Object.fromEntries(req.headers.entries()),
      url: req.url
    });

    // Get the request body
    const body = await req.json();
    console.log('Raw request body:', body);

    if (!body || typeof body !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { email, password, token } = body as RequestBody;

    if (!email || !password || !token) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, password, and token are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Received request:', { email, token }) // Don't log password

    // Validate token
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('invitations')
      .select()
      .match({ token, email })
      .single()

    console.log('Invitation lookup result:', { invitation, error: inviteError })

    if (inviteError || !invitation) {
      console.log('Invalid invitation:', { inviteError })
      return new Response(
        JSON.stringify({ error: 'Invalid invitation token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if invitation is expired or used
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      console.log('Expired invitation:', { expires_at: invitation.expires_at })
      return new Response(
        JSON.stringify({ error: 'Invitation token has expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (invitation.used_at) {
      console.log('Already used invitation:', { used_at: invitation.used_at })
      return new Response(
        JSON.stringify({ error: 'Invitation token has already been used' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('About to create user with role:', { role: invitation.role, email })

    // Create user with role
    const { data: user, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { user_role: invitation.role },
    })

    if (signUpError) {
      console.log('Error creating user:', signUpError)
      return new Response(
        JSON.stringify({ error: signUpError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User created successfully:', { userId: user.id, role: invitation.role })

    // Mark invitation as used BEFORE returning success
    const { error: updateError } = await supabaseAdmin
      .from('invitations')
      .update({ used_at: new Date().toISOString() })
      .match({ token })

    if (updateError) {
      console.log('Error marking invitation as used:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to mark invitation as used' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Invitation marked as used successfully')

    return new Response(
      JSON.stringify({ user }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 