import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { Database } from 'shared/src/types/database'

export async function POST(
  req: Request,
  { params }: { params: { messageId: string } }
) {
  try {
    // Get the message ID from the URL
    const messageId = params.messageId

    // Get the success value from the request body
    const { success } = await req.json()

    // Initialize Supabase client
    const supabase = createRouteHandlerClient<Database>({ cookies })

    // Get session to verify user is authenticated
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Update the message with feedback
    const { error: updateError } = await supabase
      .from('chat_messages')
      .update({ success })
      .eq('id', messageId)
      .eq('agent_id', session.user.id) // Ensure user owns this message

    if (updateError) {
      console.error('Error updating message:', updateError)
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