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
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  receivedAt: Date
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let client: any = null;
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

        console.log('Creating IMAP client...');
        client = new ImapFlow({
          host: 'imap.gmail.com',
          port: 993,
          secure: true,
          auth: {
            user: 'autocrm.sys@gmail.com',
            pass: Deno.env.get("GMAIL_APP_PASSWORD") || ""
          },
          logger: true
        });

        console.log('Connecting to IMAP server...');
        // Wait until client connects and authorizes
        await client.connect();
        console.log('Connected to IMAP server');

        // Select and lock a mailbox
        console.log('Getting mailbox lock...');
        let lock = await client.getMailboxLock('INBOX');
        console.log('Got mailbox lock');
        
        const emails: EmailMessage[] = [];
        
        try {
          // First search for unread messages
          console.log('Searching for unread messages...');
          const list = await client.search({ unseen: true });
          console.log(`Found ${list.length} unread messages`);
          
          // Then fetch each message
          for (const seq of list) {
            console.log(`Fetching message ${seq}...`);
            const message = await client.fetchOne(seq, {
              source: true,
              envelope: true
            });
            
            // Extract priority from subject or body
            const priorityMatch = message.source?.toString().match(/#(urgent|high|medium|low)/i);
            const priority = priorityMatch ? priorityMatch[1].toLowerCase() as 'urgent' | 'high' | 'medium' | 'low' : undefined;

            // Debug logging for envelope and inReplyTo
            console.log('Full envelope for message:', JSON.stringify(message.envelope, null, 2));
            console.log('InReplyTo array:', message.envelope.inReplyTo);

            // Parse email content
            const source = message.source?.toString() || '';
            let body = '';

            // Try multiple patterns to extract the body
            // 1. Try to find the plain text part between boundaries
            const boundaryMatch = source.match(/boundary="([^"]+)"/);
            if (boundaryMatch) {
              const boundary = boundaryMatch[1];
              const parts = source.split(`--${boundary}`);
              
              // Look for the plain text part
              for (const part of parts) {
                if (part.includes('Content-Type: text/plain')) {
                  const contentMatch = part.split(/\r?\n\r?\n/);
                  if (contentMatch.length > 1) {
                    body = contentMatch.slice(1).join('\n\n');
                    break;
                  }
                }
              }
            }

            // 2. Fallback: try to find content after headers if no boundary found
            if (!body) {
              const parts = source.split(/\r?\n\r?\n/);
              if (parts.length > 1) {
                body = parts.slice(1).join('\n\n');
              }
            }

            // Clean up the body
            body = body
              .replace(/--[^-]+--/g, '') // Remove any remaining boundaries
              .replace(/=\r?\n/g, '') // Remove soft line breaks
              .replace(/=([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))) // Handle quoted-printable
              .replace(/\r?\n\s*#(urgent|high|medium|low)/i, '\n#$1') // Clean up priority tags
              .trim();

            // Additional cleanup only for replies
            if (message.envelope.inReplyTo) {
              console.log('Cleaning up reply body. Before:', body);
              body = body
                .replace(/On.*wrote:[\s\S]*$/, '') // Remove "On... wrote:" and everything after
                .replace(/^>.*$/gm, '') // Remove quoted lines starting with >
                .trim();
              console.log('After reply cleanup:', body);
            }

            const email: EmailMessage = {
              messageId: message.envelope.messageId,
              inReplyTo: message.envelope.inReplyTo,
              from: message.envelope.from?.[0].address,
              to: message.envelope.to?.[0].address,
              subject: message.envelope.subject,
              body,
              priority,
              receivedAt: message.envelope.date
            };

            emails.push(email);

            // Mark as seen
            await client.messageFlagsAdd(seq, ['\\Seen']);
          }
        } catch (err) {
          console.error('Error processing messages:', err);
          throw err;
        } finally {
          // Always release the lock
          console.log('Releasing mailbox lock...');
          lock.release();
        }

        // Close the connection
        if (client) {
          console.log('Logging out of IMAP server...');
          await client.logout();
          console.log('Logged out of IMAP server');
        }

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
    // Make sure to clean up IMAP client on error
    if (client) {
      try {
        console.log('Cleaning up IMAP client after error...');
        await client.logout();
      } catch (cleanupError) {
        console.error('Error cleaning up IMAP client:', cleanupError);
      }
    }

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
