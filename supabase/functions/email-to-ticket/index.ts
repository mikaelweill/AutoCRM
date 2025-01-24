// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from '../_shared/cors.ts'

console.log("Hello from Functions!")

interface EmailMessage {
  messageId: string
  inReplyTo?: string
  from: string
  to: string
  subject: string
  body: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  receivedAt: Date
  attachments?: Array<{
    filename: string
    content: Uint8Array
    contentType: string
  }>
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function findUserByEmail(email: string) {
  const { data: user, error } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single()
  
  if (error) throw new Error(`Error finding user: ${error.message}`)
  return user
}

async function findTicketByMessageId(messageId: string) {
  const { data, error } = await supabase
    .from('ticket_emails')
    .select('ticket_id')
    .eq('message_id', messageId)
    .single()

  if (error) {
    console.log('No ticket found for message:', messageId)
    return null
  }

  return data
}

async function isEmailProcessed(messageId: string) {
  const { data, error } = await supabase
    .from('ticket_emails')
    .select('id')
    .eq('message_id', messageId)
    .single()

  if (error) {
    console.log('Email not previously processed:', messageId)
    return false
  }

  return true
}

async function createTicketFromEmail(email: EmailMessage) {
  // Find user by email
  const user = await findUserByEmail(email.from)
  if (!user) {
    console.log(`Skipping email from unknown user: ${email.from}`)
    return null
  }

  // Start a transaction
  const { data: ticket, error: ticketError } = await supabase
    .from('tickets')
    .insert({
      client_id: user.id,
      subject: email.subject,
      description: email.body,
      priority: email.priority || 'medium',
      status: 'new',
      source: 'email',
      created_at: email.receivedAt,
      updated_at: email.receivedAt
    })
    .select()
    .single()

  if (ticketError) throw new Error(`Error creating ticket: ${ticketError.message}`)

  // Save email metadata
  const { error: emailError } = await supabase
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

  if (emailError) throw new Error(`Error saving email metadata: ${emailError.message}`)

  return ticket
}

async function createTicketComment(ticketId: string, email: EmailMessage) {
  // First find the user
  const user = await findUserByEmail(email.from)
  if (!user) {
    throw new Error(`No user found for email: ${email.from}`)
  }

  // Store the email metadata
  const { error: emailError } = await supabase
    .from('ticket_emails')
    .insert({
      ticket_id: ticketId,
      message_id: email.messageId,
      in_reply_to: email.inReplyTo,
      from_email: email.from,
      to_email: email.to,
      subject: email.subject,
      direction: 'inbound',
      received_at: email.receivedAt
    })

  if (emailError) throw new Error(`Error saving email metadata: ${emailError.message}`)

  // Create the comment
  const { error: commentError } = await supabase
    .from('ticket_activities')
    .insert({
      ticket_id: ticketId,
      activity_type: 'comment',
      content: email.body,
      created_at: email.receivedAt,
      user_id: user.id
    })

  if (commentError) throw new Error(`Error creating comment: ${commentError.message}`)
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Call the IMAP check endpoint
    const imapResponse = await fetch(`${supabaseUrl}/functions/v1/gmail-imap/check`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!imapResponse.ok) {
      throw new Error(`IMAP check failed: ${await imapResponse.text()}`)
    }

    const { emails = [] } = await imapResponse.json()
    console.log(`Received ${emails.length} unread emails from IMAP`)

    const results = []
    let processedCount = 0
    let skippedCount = 0
    let replyCount = 0
    let newCount = 0

    for (const email of emails) {
      try {
        // Check if we've already processed this email
        if (await isEmailProcessed(email.messageId)) {
          console.log(`Skipping already processed email: ${email.messageId}`)
          skippedCount++
          results.push({
            type: 'skip',
            success: true,
            emailId: email.messageId,
            reason: 'already_processed'
          })
          continue
        }

        processedCount++
        
        // Check if this is a reply to an existing ticket
        if (email.inReplyTo) {
          console.log(`Processing potential reply - Message ID: ${email.messageId}, In-Reply-To: ${email.inReplyTo}`)
          const originalEmail = await findTicketByMessageId(email.inReplyTo)
          if (originalEmail) {
            console.log(`Found original ticket ${originalEmail.ticket_id} for reply`)
            replyCount++
            // This is a reply to an existing ticket
            await createTicketComment(originalEmail.ticket_id, email)
            results.push({
              type: 'reply',
              success: true,
              emailId: email.messageId,
              ticketId: originalEmail.ticket_id
            })
            continue // Skip creating a new ticket
          } else {
            console.log(`Could not find original ticket for In-Reply-To: ${email.inReplyTo}, creating new ticket instead`)
          }
        } else {
          console.log(`Email ${email.messageId} is not a reply (no In-Reply-To header)`)
        }

        // If not a reply or original ticket not found, create new ticket
        const ticket = await createTicketFromEmail(email)
        if (ticket) {
          newCount++
          results.push({
            type: 'new',
            success: true,
            emailId: email.messageId,
            ticketId: ticket.id,
            ticketNumber: ticket.number
          })
        }
      } catch (error) {
        console.error(`Error processing email ${email.messageId}:`, error)
        results.push({
          type: email.inReplyTo ? 'reply' : 'new',
          success: false,
          emailId: email.messageId,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }

    console.log(`
Processing summary:
- Total unread: ${emails.length}
- Already processed: ${skippedCount}
- New tickets: ${newCount}
- Replies: ${replyCount}
- Errors: ${emails.length - (skippedCount + newCount + replyCount)}
`)

    return new Response(
      JSON.stringify({
        processed: emails.length,
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
        error: error instanceof Error ? error.message : String(error)
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
