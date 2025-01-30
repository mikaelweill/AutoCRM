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
      console.error('Error inserting message:', insertError)
      return NextResponse.json(
        { error: 'Failed to save message' },
        { status: 500 }
      )
    }

    // Process message with AI agent
    const agentResponse = await processMessage(content, session.user.id)
    
    // Insert AI response into database
    const { data: aiMessage, error: aiInsertError } = await supabase
      .from('chat_messages')
      .insert({
        agent_id: session.user.id,
        content: agentResponse.content,
        sender: 'assistant' as ChatMessageSender,
        langsmith_trace_id: agentResponse.trace_id
      })
      .select()
      .single()

    if (aiInsertError) {
      console.error('Error inserting AI response:', aiInsertError)
      return NextResponse.json(
        { error: 'Failed to save AI response' },
        { status: 500 }
      )
    }

    // Return both messages and whether tools were used
    return NextResponse.json({
      messages: [userMessage, aiMessage],
      toolsUsed: agentResponse.actions && agentResponse.actions.length > 0
    })
  } catch (error) {
    console.error('Error processing message:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Add feedback endpoint
export async function PATCH(req: Request) {
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
        { error: 'Only agents can provide feedback' },
        { status: 403 }
      )
    }

    // Get message ID from URL
    const messageId = req.url.split('/').pop()
    if (!messageId) {
      return NextResponse.json(
        { error: 'Message ID is required' },
        { status: 400 }
      )
    }

    // Parse request body
    const { success } = await req.json()
    if (typeof success !== 'boolean') {
      return NextResponse.json(
        { error: 'Success boolean is required' },
        { status: 400 }
      )
    }

    // Update message with feedback
    const { error: updateError } = await supabase
      .from('chat_messages')
      .update({ success })
      .eq('id', messageId)
      .eq('agent_id', session.user.id) // Ensure agent owns the message

    if (updateError) {
      console.error('Error updating message:', updateError)
      return NextResponse.json(
        { error: 'Failed to save feedback' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving feedback:', error)
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
      .order('created_at', { ascending: false })
      .limit(100)

    if (fetchError) {
      console.error('Error fetching messages:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      )
    }

    // Group messages by timestamp to detect duplicates
    const uniqueMessages = messages?.reduce((acc: any[], message) => {
      const lastMessage = acc[acc.length - 1]
      
      // If this is an assistant message, check if it's a duplicate
      if (message.sender === 'assistant' && lastMessage?.sender === 'assistant' && message.created_at && lastMessage.created_at) {
        const timeDiff = Math.abs(
          new Date(message.created_at).getTime() - new Date(lastMessage.created_at).getTime()
        )
        // If messages are within 1 second of each other, consider them duplicates
        if (timeDiff < 1000) {
          return acc // Skip this message
        }
      }
      
      return [...acc, message]
    }, []) || []

    // Reverse the array to maintain correct chat display order (oldest first, newest last)
    return NextResponse.json(uniqueMessages.reverse())

  } catch (error) {
    console.error('Error in chat messages API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 