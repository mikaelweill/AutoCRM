import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { hasRequiredRole } from 'shared/src/auth/utils'
import { AuthUser } from 'shared/src/auth/types'
import { Database } from 'shared/src/types/database'
import { processMessage } from 'shared/src/lib/ai/agent'
import { createServerClient } from 'shared/src/lib/supabase-server'
import { Client, Run } from 'langsmith'

type ChatMessageSender = 'agent' | 'assistant'

// Define our own KVMap type to match LangSmith's internal type
type KVMap = { [key: string]: any }

interface LangSmithRun extends Omit<Run, 'start_time' | 'end_time' | 'error' | 'inputs' | 'outputs'> {
  start_time: number
  end_time: number
  error?: string
  error_info?: {
    type: string
    message: string
  }
  metrics?: {
    total_tokens?: number
    prompt_tokens?: number
    completion_tokens?: number
  }
  inputs: KVMap & {
    input?: string
  }
  outputs: KVMap & {
    output?: string
    intermediateSteps?: any[]
  }
  extra?: {
    runtime?: any
    metadata?: any
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    const serverClient = createServerClient()
    
    // Initialize LangSmith client
    const langsmithClient = new Client({
      apiUrl: "https://api.smith.langchain.com",
      apiKey: process.env.LANGCHAIN_API_KEY,
    })

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
    const { data: userMessage, error: insertError } = await serverClient
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
    const { data: aiMessage, error: aiInsertError } = await serverClient
      .from('chat_messages')
      .insert({
        agent_id: session.user.id,
        content: agentResponse.content,
        sender: 'assistant' as ChatMessageSender
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

    // Create the message_run record
    const { error: runInsertError } = await serverClient
      .from('message_runs')
      .insert({
        message_id: aiMessage.id,
        langsmith_run_id: agentResponse.trace_id,
        original_prompt: content,
        actions: agentResponse.actions,
        success: null,
        feedback_message: null
      })

    if (runInsertError) {
      console.error('Error inserting message run:', runInsertError)
      // Don't fail the request, just log the error
    }

    // Fetch LangSmith data asynchronously
    const traceId: string | undefined = agentResponse.trace_id
    if (typeof traceId === 'string') {
      // Don't await this - let it run in background
      (async () => {
        try {
          console.log('Looking for runs with trace ID:', traceId)

          // Debug connection
          console.log('API Key exists:', !!process.env.LANGCHAIN_API_KEY)
          console.log('API Key length:', process.env.LANGCHAIN_API_KEY?.length)

          // Get project ID
          let projectId = process.env.LANGCHAIN_PROJECT_ID
          console.log('Initial project ID from env:', projectId)
          
          if (!projectId) {
            console.log('No project ID in env, trying to find it...')
            for await (const project of langsmithClient.listProjects()) {
              console.log('Found project:', {
                id: project.id,
                name: project.name
              })
              if (project.name === process.env.LANGCHAIN_PROJECT) {
                projectId = project.id
                console.log('Matched project ID:', projectId)
                break
              }
            }
          }

          if (!projectId) {
            console.error('Could not find project ID')
            return
          }

          // First get all runs and log them
          let runCount = 0
          
          console.log('Looking for AgentExecutor run with trace ID:', traceId)
          
          // Function to get run with retries
          const getRunWithRetries = async (maxAttempts = 5): Promise<LangSmithRun | undefined> => {
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
              // Exponential backoff: 2s, 4s, 8s, 16s, 32s
              const delay = 2000 * Math.pow(2, attempt - 1)
              console.log(`Attempt ${attempt}/${maxAttempts}: Waiting ${delay/1000}s for run to complete...`)
              await new Promise(resolve => setTimeout(resolve, delay))
              
              let runCount = 0
              for await (const run of langsmithClient.listRuns({ projectId })) {
                runCount++
                if (run.name === 'AgentExecutor' && run.tags?.includes(traceId)) {
                  console.log('Found matching AgentExecutor run:', {
                    id: run.id,
                    name: run.name,
                    tags: run.tags,
                    start_time: run.start_time ? new Date(run.start_time).toISOString() : 'unknown',
                    status: run.status,
                    end_time: run.end_time ? new Date(run.end_time).toISOString() : 'not completed'
                  })
                  
                  // If run is completed, return it
                  if ((run.status === 'completed' || run.status === 'success') && run.end_time) {
                    console.log('Run completed successfully. Details:', {
                      id: run.id,
                      status: run.status,
                      start_time: run.start_time ? new Date(run.start_time).toISOString() : null,
                      end_time: run.end_time ? new Date(run.end_time).toISOString() : null,
                      duration_ms: run.end_time && run.start_time ? 
                        new Date(run.end_time).getTime() - new Date(run.start_time).getTime() : null,
                      token_usage: {
                        prompt_tokens: run.prompt_tokens || 0,
                        completion_tokens: run.completion_tokens || 0,
                        total_tokens: run.total_tokens || 0
                      },
                      cost: run.total_cost || 0,
                      latency: run.end_time && run.first_token_time ? 
                        new Date(run.end_time).getTime() - new Date(run.first_token_time).getTime() : null
                    })

                    // Update message_run with complete LangSmith data
                    const { error: updateError } = await serverClient
                      .from('message_runs')
                      .update({
                        // Basic info
                        langsmith_run_id: run.id,
                        success: true,
                        status: run.status,

                        // Timing info
                        start_time: run.start_time ? new Date(run.start_time).toISOString() : null,
                        end_time: run.end_time ? new Date(run.end_time).toISOString() : null,
                        duration_ms: run.end_time && run.start_time ? 
                          new Date(run.end_time).getTime() - new Date(run.start_time).getTime() : null,
                        latency: run.end_time && run.first_token_time ? 
                          new Date(run.end_time).getTime() - new Date(run.first_token_time).getTime() : null,

                        // Token and cost info
                        total_tokens: run.total_tokens || null,
                        token_usage: {
                          prompt_tokens: run.prompt_tokens || 0,
                          completion_tokens: run.completion_tokens || 0,
                          total_tokens: run.total_tokens || 0
                        },
                        cost: run.total_cost || null,

                        // Input/Output
                        raw_input: run.inputs?.input || null,
                        raw_output: run.outputs?.output || null,

                        // Error info (should be null for success)
                        error_type: null,
                        error_message: null,

                        // Extra metadata
                        runtime_info: run.extra?.runtime || null,
                        metadata: {
                          ...run.extra?.metadata,
                          intermediate_steps: run.outputs?.intermediateSteps || [],
                          feedback_stats: run.feedback_stats || null,
                          session_id: run.session_id || null,
                          app_path: run.app_path || null
                        }
                      })
                      .eq('langsmith_run_id', traceId)
                    
                    if (updateError) {
                      console.error('Error updating message run with LangSmith data:', updateError)
                    } else {
                      console.log('Successfully updated message run with all fields')
                    }

                    return run as unknown as LangSmithRun
                  }
                  
                  // If run errored, return it
                  if (run.status === 'error') {
                    console.log('Run errored')
                    return run as unknown as LangSmithRun
                  }
                  
                  console.log(`Run still ${run.status}, will retry...`)
                  break
                }
              }
              console.log(`Processed ${runCount} runs in attempt ${attempt}`)
            }
            
            console.log('Max attempts reached, giving up')
            return undefined
          }
          
          let agentRun = await getRunWithRetries()
          
          if (!agentRun) {
            console.error('No completed AgentExecutor run found for trace ID:', traceId)
            return
          }

          // Log the data structure
          console.log('LangSmith data:', JSON.stringify(agentRun, null, 2))

          // Convert timestamps to ISO strings
          const startTime = new Date(agentRun.start_time).toISOString()
          const endTime = new Date(agentRun.end_time).toISOString()

          // Update message_run with LangSmith data
          const { error: updateError } = await serverClient
            .from('message_runs')
            .update({
              start_time: startTime,
              end_time: endTime,
              duration_ms: agentRun.end_time - agentRun.start_time,
              raw_input: agentRun.inputs?.input || null,
              raw_output: agentRun.outputs?.output || null,
              status: agentRun.error ? 'error' : 'completed',
              error_type: agentRun.error_info?.type || null,
              error_message: agentRun.error_info?.message || null,
              total_tokens: agentRun.metrics?.total_tokens || null,
              token_usage: {
                prompt_tokens: agentRun.metrics?.prompt_tokens || 0,
                completion_tokens: agentRun.metrics?.completion_tokens || 0,
                total_tokens: agentRun.metrics?.total_tokens || 0
              },
              runtime_info: agentRun.extra?.runtime || null,
              metadata: {
                ...agentRun.extra?.metadata,
                intermediate_steps: agentRun.outputs?.intermediateSteps || []
              }
            })
            .eq('langsmith_run_id', traceId)
          
          if (updateError) {
            console.error('Error updating message run with LangSmith data:', updateError)
          }
        } catch (error) {
          console.error('Error fetching LangSmith data:', error)
        }
      })()
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

export async function GET(req: Request) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    const serverClient = createServerClient()
    
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
    const { data: messages, error: fetchError } = await serverClient
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