import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { Database } from 'shared/src/types/database'
import { createServerClient } from 'shared/src/lib/supabase-server'

export async function POST(
  req: Request,
  { params }: { params: { messageId: string } }
) {
  try {
    // Get the message ID from the URL
    const messageId = params.messageId

    // Get the success value and feedback message from the request body
    const { success, feedback_message } = await req.json()

    // Initialize clients
    const supabase = createRouteHandlerClient<Database>({ cookies })
    const serverClient = createServerClient()

    // Get session to verify user is authenticated
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Update message run with feedback
    const { error: updateError } = await serverClient
      .from('message_runs')
      .update({ 
        success,
        feedback_message,
        updated_at: new Date().toISOString()
      })
      .eq('message_id', messageId)

    if (updateError) {
      console.error('Error updating message run:', updateError)
      return NextResponse.json(
        { error: 'Failed to save feedback' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in feedback route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 