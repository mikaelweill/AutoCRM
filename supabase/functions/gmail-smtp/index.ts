// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import * as nodemailer from "npm:nodemailer"

console.log("Starting SMTP Function")

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  to: string
  subject: string
  body: string
  html?: string  // Optional HTML version
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create reusable transporter object using SMTP
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: "autocrm.sys@gmail.com",
        pass: Deno.env.get("GMAIL_APP_PASSWORD"),
      },
    });

    // Parse request URL
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    switch (path) {
      case 'send':
        if (req.method !== 'POST') {
          return new Response('Method not allowed', { 
            status: 405,
            headers: corsHeaders 
          })
        }

        const { to, subject, body, html }: EmailRequest = await req.json()
        
        // Send email
        const info = await transporter.sendMail({
          from: '"AutoCRM" <autocrm.sys@gmail.com>',
          to: to,
          subject: subject,
          text: body,
          html: html
        });

        console.log("Message sent: %s", info.messageId);

        return new Response(JSON.stringify({ 
          success: true,
          message: 'Email sent successfully',
          messageId: info.messageId
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        })

      default:
        return new Response('Not found', { 
          status: 404,
          headers: corsHeaders 
        })
    }
  } catch (error: unknown) {
    console.error('Detailed error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
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

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/gmail-smtp' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
