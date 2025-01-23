import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

interface RequestBody {
  email: string
  password: string
}

interface ResponseBody {
  error?: string
  user?: any
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
  'http://localhost:3000',  // client portal only
  'https://auto-crm-client.vercel.app',
].filter(Boolean)

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

serve(async (req: Request) => {
  // Handle CORS with origin validation
  const origin = req.headers.get('origin')
  console.log('Received request from origin:', origin)

  if (!origin || !allowedOrigins.includes(origin)) {
    console.log('Invalid origin:', { origin, allowedOrigins })
    return new Response('Not allowed', { 
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Set CORS headers with validated origin
  const headersWithOrigin = {
    ...corsHeaders,
    'Access-Control-Allow-Origin': origin
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: headersWithOrigin })
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
        { status: 400, headers: { ...headersWithOrigin, 'Content-Type': 'application/json' } }
      )
    }

    const { email, password } = body as RequestBody;

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email and password are required' }),
        { status: 400, headers: { ...headersWithOrigin, 'Content-Type': 'application/json' } }
      )
    }

    console.log('About to create client user:', { email })

    // Create user with client role
    const { data: user, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { user_role: 'client' },
    })

    if (signUpError) {
      console.log('Error creating user:', signUpError)
      return new Response(
        JSON.stringify({ error: signUpError.message }),
        { status: 400, headers: { ...headersWithOrigin, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Auth user created successfully:', { userId: user.user.id })

    // Create corresponding record in public.users
    const { error: publicUserError } = await supabaseAdmin
      .from('users')
      .insert({
        id: user.user.id,
        email: email,
        role: 'client',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (publicUserError) {
      console.log('Error creating public user:', publicUserError)
      return new Response(
        JSON.stringify({ error: 'Failed to create user record' }),
        { status: 500, headers: { ...headersWithOrigin, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Public user created successfully')

    return new Response(
      JSON.stringify({ user }),
      { status: 200, headers: { ...headersWithOrigin, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...headersWithOrigin, 'Content-Type': 'application/json' } }
    )
  }
}) 