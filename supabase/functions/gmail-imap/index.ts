// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { ImapFlow } from "npm:imapflow"

console.log("Starting IMAP Function")

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

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request URL
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    switch (path) {
      case 'check':
        if (req.method !== 'POST') {
          return new Response('Method not allowed', { 
            status: 405,
            headers: corsHeaders 
          })
        }

        const client = new ImapFlow({
          host: 'imap.gmail.com',
          port: 993,
          secure: true,
          auth: {
            user: 'autocrm.sys@gmail.com',
            pass: Deno.env.get("GMAIL_APP_PASSWORD") || ""
          }
        });

        // Wait until client connects and authorizes
        await client.connect();

        // Select and lock a mailbox
        let lock = await client.getMailboxLock('INBOX');
        const emails: EmailMessage[] = [];
        
        try {
          // First search for unread messages
          const list = await client.search({ unseen: true });
          console.log(`Found ${list.length} unread messages`);
          
          // Then fetch each message
          for (const seq of list) {
            const message = await client.fetchOne(seq, {
              source: true,
              envelope: true
            });
            
            // Extract priority from subject or body
            const priorityMatch = message.source?.toString().match(/#(high|medium|low)/i);
            const priority = priorityMatch ? priorityMatch[1].toLowerCase() as 'high' | 'medium' | 'low' : undefined;

            const email: EmailMessage = {
              messageId: message.envelope.messageId,
              inReplyTo: message.envelope.inReplyTo?.[0],
              from: message.envelope.from?.[0].address,
              to: message.envelope.to?.[0].address,
              subject: message.envelope.subject,
              body: message.source?.toString() || '',
              priority,
              receivedAt: message.envelope.date
            };

            emails.push(email);

            // Mark as seen
            await client.messageFlagsAdd(seq, ['\\Seen']);
          }
        } finally {
          // Always release the lock
          lock.release();
        }

        // Close the connection
        await client.logout();

        return new Response(JSON.stringify({ 
          success: true,
          count: emails.length,
          emails
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

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/gmail-imap' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
