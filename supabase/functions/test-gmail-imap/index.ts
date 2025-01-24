// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

console.log("Hello from Functions!")

serve(async (req: Request) => {
  try {
    // Basic check to ensure environment variables are set
    const user = Deno.env.get('GMAIL_USER')
    const pass = Deno.env.get('GMAIL_APP_PASSWORD')

    if (!user || !pass) {
      throw new Error('Gmail credentials not configured')
    }

    // Test connection to Gmail using HTTPS
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages', {
      headers: {
        'Authorization': `Bearer ${pass}`,
        'Accept': 'application/json'
      }
    })

    const data = await response.json()

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Gmail API test',
        response: data
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error: any) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/test-gmail-imap' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
