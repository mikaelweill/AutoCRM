// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

// @deno-types="npm:@types/node"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { google } from "npm:googleapis@126.0.1"

console.log("Starting Gmail API Function")

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  to: string
  subject: string
  body: string
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Gmail API client with OAuth2
    const oauth2Client = new google.auth.OAuth2(
      Deno.env.get("GOOGLE_CLIENT_ID"),
      Deno.env.get("GOOGLE_CLIENT_SECRET"),
      'https://nkicqyftdkfphifgvejh.supabase.co/functions/v1/gmail-api/callback'
    );

    // Parse request URL
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    // Handle different operations based on path
    switch (path) {
      case 'auth':
        // Generate auth URL for initial setup
        const authUrl = oauth2Client.generateAuthUrl({
          access_type: 'offline',
          scope: [
            'https://www.googleapis.com/auth/gmail.modify',
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/gmail.metadata'
          ],
          prompt: 'consent'  // Force consent screen to get refresh token
        });
        
        // Return HTML that redirects to auth URL
        return new Response(
          `<html>
            <body>
              <h1>Redirecting to Google Auth...</h1>
              <p>Click <a href="${authUrl}">here</a> if not redirected.</p>
              <script>window.location.href = '${authUrl}';</script>
            </body>
          </html>`,
          {
            headers: { ...corsHeaders, 'Content-Type': 'text/html' },
            status: 200
          }
        );

      case 'callback':
        const code = new URL(req.url).searchParams.get('code');
        if (!code) {
          throw new Error('No code provided');
        }

        const { tokens } = await oauth2Client.getToken(code);
        console.log("Got tokens:", tokens);
        
        // Return HTML with tokens
        return new Response(
          `<html>
            <body>
              <h1>Authentication Successful!</h1>
              <p>Add these tokens to your Supabase Edge Function environment variables:</p>
              <pre>
GMAIL_ACCESS_TOKEN=${tokens.access_token}
GMAIL_REFRESH_TOKEN=${tokens.refresh_token}
              </pre>
            </body>
          </html>`,
          {
            headers: { ...corsHeaders, 'Content-Type': 'text/html' },
            status: 200
          }
        );

      default:
        return new Response('Visit /gmail-api/auth to start authentication', { 
          status: 404,
          headers: corsHeaders 
        })
    }
  } catch (error: unknown) {
    console.error('Detailed error:', error)
    const errorMessage = error instanceof Error ? 
      `${error.message} - ${JSON.stringify(error)}` : 
      'Unknown error'
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: error
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/gmail-api' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
