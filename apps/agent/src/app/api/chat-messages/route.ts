import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { hasRequiredRole } from 'shared/src/auth/utils'
import { AuthUser } from 'shared/src/auth/types'
import { Database } from 'shared/src/types/database'
import { processMessage } from 'shared/src/lib/ai/agent'

type ChatMessageSender = 'agent' | 'assistant'

export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user is an agent
    if (!hasRequiredRole(session.user as AuthUser, 'agent')) {
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

    // Insert user message into database
    const { data: userMessage, error: insertError } = await supabase
      .from('chat_messages')
      .insert({
        agent_id: session.user.id,
        content: content.trim(),
        sender: 'agent' as ChatMessageSender
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

    // Process message through AI
    const aiResponse = await processMessage(content)

    // Save AI response
    const { data: assistantMessage, error: aiInsertError } = await supabase
      .from('chat_messages')
      .insert({
        agent_id: session.user.id,
        content: aiResponse.content,
        sender: 'assistant' as ChatMessageSender,
        langsmith_trace_id: aiResponse.trace_id,
        success: null  // Initially null, will be set by human agent later
      })
      .select()
      .single()

    if (aiInsertError) {
      console.error('Error saving AI response:', aiInsertError)
      return NextResponse.json(
        { error: 'Failed to save AI response' },
        { status: 500 }
      )
    }

    // Return both messages
    return NextResponse.json({
      userMessage,
      assistantMessage
    })

  } catch (error) {
    console.error('Error in chat messages API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user is an agent
    if (!hasRequiredRole(session.user as AuthUser, 'agent')) {
      return NextResponse.json(
        { error: 'Only agents can view messages' },
        { status: 403 }
      )
    }

    // Fetch messages for current agent
    const { data: messages, error: fetchError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('agent_id', session.user.id)
      .order('created_at', { ascending: true })

    if (fetchError) {
      console.error('Error fetching messages:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      )
    }

    return NextResponse.json(messages)

  } catch (error) {
    console.error('Error in chat messages API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 