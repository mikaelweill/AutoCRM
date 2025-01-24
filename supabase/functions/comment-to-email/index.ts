// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "jsr:@supabase/supabase-js"

// For Deno types
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

console.log("Starting Comment-to-Email Function")

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CommentRequest {
  ticketId: string
  commentId: string
  content: string
  userId: string
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const authToken = req.headers.get('Authorization')
    
    if (!supabaseUrl || !supabaseServiceKey || !authToken) {
      throw new Error('Missing environment variables or auth token')
    }

    // Create admin client with service role key for DB operations
    const supabase = createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: { persistSession: false },
      }
    )

    // Get user ID from auth token
    const { data: { user }, error: authError } = await supabase.auth.getUser(authToken.replace('Bearer ', ''))
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid auth token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { ticketId, commentId, content, userId } = await req.json() as CommentRequest

    // 1. Verify the commenter is an admin/agent
    const { data: userRole, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    console.log('User role check:', { userRole, userError })
    
    if (userError || !(userRole?.role === 'admin' || userRole?.role === 'agent')) {
      console.log('Role check failed:', { 
        hasError: !!userError, 
        userRole: userRole?.role,
        isAdmin: userRole?.role === 'admin',
        isAgent: userRole?.role === 'agent'
      })
      return new Response(
        JSON.stringify({ error: 'Only admins and agents can send email replies' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Get the ticket's email thread info
    const { data: emailThread, error: threadError } = await supabase
      .from('ticket_emails')
      .select('message_id, from_email, subject')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (threadError || !emailThread) {
      return new Response(
        JSON.stringify({ error: 'No email thread found for this ticket' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Send the email reply using gmail-smtp
    const emailResponse = await fetch(
      `${supabaseUrl}/functions/v1/gmail-smtp/send`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.get('Authorization') || '',
        },
        body: JSON.stringify({
          to: emailThread.from_email,
          subject: emailThread.subject.startsWith('Re: ') 
            ? emailThread.subject 
            : `Re: ${emailThread.subject}`,
          body: content,
          headers: {
            'In-Reply-To': emailThread.message_id,
            'References': emailThread.message_id,
          }
        })
      }
    )

    if (!emailResponse.ok) {
      const error = await emailResponse.text()
      throw new Error(`Failed to send email: ${error}`)
    }

    // 4. Update the ticket_emails table with the sent email
    const { error: insertError } = await supabase
      .from('ticket_emails')
      .insert({
        ticket_id: ticketId,
        from_email: 'autocrm.sys@gmail.com',
        to_email: emailThread.from_email,
        subject: emailThread.subject,
        in_reply_to: emailThread.message_id,
        direction: 'outbound'
      })

    if (insertError) {
      console.error('Failed to record email in database:', insertError)
      // Don't return error since email was sent successfully
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Comment sent as email reply' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Error:', error instanceof Error ? error.message : error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 