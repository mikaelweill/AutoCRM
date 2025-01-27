import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { hasRequiredRole } from 'shared/src/auth/utils'

export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user is an agent
    if (!hasRequiredRole(session.user, 'agent')) {
      return NextResponse.json(
        { error: 'Only agents can send messages' },
        { status: 403 }
      )
    }

    // Parse request body
    const { content } = await req.json()
    if (!content?.trim()) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      )
    }

    // Insert message into database
    const { data: message, error: insertError } = await supabase
      .from('chat_messages')
      .insert({
        agent_id: session.user.id,
        content: content.trim(),
        sender: 'user'
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error saving message:', insertError)
      return NextResponse.json(
        { error: 'Failed to save message' },
        { status: 500 }
      )
    }

    return NextResponse.json(message)

  } catch (error) {
    console.error('Error in chat messages API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 