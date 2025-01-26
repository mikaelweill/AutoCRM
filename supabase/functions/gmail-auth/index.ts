// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { OAuth2Client } from "https://deno.land/x/oauth2_client@v1.0.2/mod.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// Add CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Types for OAuth tokens
interface OAuthTokens {
  access_token: string
  refresh_token: string
  expires_at: number
}

const REDIRECT_URI = 'https://nkicqyftdkfphifgvejh.supabase.co/functions/v1/gmail-auth/callback'

// Initialize OAuth2 client
const oauth2Client = new OAuth2Client({
  clientId: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
  clientSecret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
  authorizationEndpointUri: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUri: 'https://oauth2.googleapis.com/token',
  redirectUri: REDIRECT_URI,
  defaults: {
    scope: ['https://www.googleapis.com/auth/gmail.modify',
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/gmail.labels',
            'https://www.googleapis.com/auth/gmail.metadata']
  }
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

console.log("Hello from Functions!")

serve(async (req: Request) => {
  try {
    const url = new URL(req.url)
    
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }
    
    // Handle callback path
    if (url.pathname === '/functions/v1/gmail-auth/callback') {
      try {
        const code = url.searchParams.get('code')
        if (!code) throw new Error('No authorization code received')

        const tokens = await oauth2Client.code.getToken(code)
        
        return new Response(
          `<html><body><h1>Authentication successful!</h1></body></html>`,
          { 
            headers: { 
              ...corsHeaders,
              'Content-Type': 'text/html',
            } 
          }
        )
      } catch (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        )
      }
    }

    // Handle initial request
    const { uri } = await oauth2Client.code.getAuthorizationUri()
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': uri
      }
    })
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/gmail-auth' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
