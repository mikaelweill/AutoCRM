// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

console.log("Hello from Functions!")

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailMessage {
  messageId: string
  inReplyTo?: string
  from: string
  to: string
  subject: string
  body: string
  priority?: 'high' | 'medium' | 'low'
  receivedAt: Date
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Fetch new emails
    const response = await fetch(
      `${supabaseUrl}/functions/v1/gmail-imap/check`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseAnonKey}`,
        }
      }
    )

    if (!response.ok) {
      throw new Error('Failed to fetch emails')
    }

    const { emails } = await response.json()
    const results = []

    // 2. Process each email
    for (const email of emails) {
      try {
        // Check if this is a reply to existing ticket
        const { data: existingEmail } = await supabase
          .from('ticket_emails')
          .select('ticket_id')
          .eq('message_id', email.inReplyTo)
          .single()

        if (existingEmail) {
          // Update existing ticket
          const { data: ticket } = await supabase
            .from('tickets')
            .select('*')
            .eq('id', existingEmail.ticket_id)
            .single()

          if (ticket) {
            // Add comment to ticket
            const { data: comment } = await supabase
              .from('ticket_comments')
              .insert({
                ticket_id: ticket.id,
                content: email.body,
                author_id: ticket.client_id // Since it's from client
              })
              .select()
              .single()

            // Save email metadata
            const { data: emailRecord } = await supabase
              .from('ticket_emails')
              .insert({
                ticket_id: ticket.id,
                message_id: email.messageId,
                in_reply_to: email.inReplyTo,
                from_email: email.from,
                to_email: email.to,
                subject: email.subject,
                direction: 'inbound',
                received_at: email.receivedAt
              })
              .select()
              .single()

            results.push({
              type: 'update',
              ticket_id: ticket.id,
              comment_id: comment?.id,
              email_id: emailRecord?.id
            })
          }
        } else {
          // Create new ticket
          const { data: client } = await supabase
            .from('clients')
            .select('id')
            .eq('email', email.from)
            .single()

          // If client doesn't exist, create one
          let clientId = client?.id
          if (!clientId) {
            const { data: newClient } = await supabase
              .from('clients')
              .insert({
                email: email.from,
                name: email.from.split('@')[0] // Use email username as temp name
              })
              .select()
              .single()
            
            clientId = newClient?.id
          }

          if (clientId) {
            // Create ticket
            const { data: ticket } = await supabase
              .from('tickets')
              .insert({
                title: email.subject,
                description: email.body,
                client_id: clientId,
                priority: email.priority || 'medium',
                status: 'new',
                source: 'email'
              })
              .select()
              .single()

            if (ticket) {
              // Save email metadata
              const { data: emailRecord } = await supabase
                .from('ticket_emails')
                .insert({
                  ticket_id: ticket.id,
                  message_id: email.messageId,
                  in_reply_to: email.inReplyTo,
                  from_email: email.from,
                  to_email: email.to,
                  subject: email.subject,
                  direction: 'inbound',
                  received_at: email.receivedAt
                })
                .select()
                .single()

              results.push({
                type: 'create',
                ticket_id: ticket.id,
                email_id: emailRecord?.id
              })

              // TODO: Send auto-response
            }
          }
        }
      } catch (error) {
        console.error('Error processing email:', error)
        results.push({
          type: 'error',
          email: email.messageId,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
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

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/email-to-ticket' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
