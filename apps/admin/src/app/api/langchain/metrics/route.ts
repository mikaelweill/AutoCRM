import { Client, Run } from 'langsmith'
import { NextResponse } from 'next/server'

interface MetricsAccumulator {
  totalLatency: number
  promptTokens: number
  completionTokens: number
  totalTokens: number
  totalCost: number
}

export async function POST(request: Request) {
  try {
    const { traceIds } = await request.json()

    if (!traceIds || !Array.isArray(traceIds) || traceIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or empty trace IDs' },
        { status: 400 }
      )
    }

    const client = new Client({
      apiUrl: "https://api.smith.langchain.com",
      apiKey: process.env.LANGCHAIN_API_KEY,
    })

    // Debug connection
    console.log('API Key exists:', !!process.env.LANGCHAIN_API_KEY)
    console.log('API Key length:', process.env.LANGCHAIN_API_KEY?.length)

    // Test basic API connection
    try {
      console.log('Testing API connection...')
      const projects = await client.listProjects()
      console.log('API connection successful - can list projects')
    } catch (err) {
      console.error('API connection test failed:', err)
    }

    // Get project ID
    let projectId = process.env.LANGCHAIN_PROJECT_ID
    console.log('Initial project ID from env:', projectId)
    
    if (!projectId) {
      console.log('No project ID in env, trying to find it...')
      for await (const project of client.listProjects()) {
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

    // Now try to fetch runs with our trace IDs
    try {
      console.log('Looking for AgentExecutor runs...')
      let runCount = 0
      let executorRuns = 0
      
      for await (const run of client.listRuns({ 
        projectId
      })) {
        runCount++
        
        if (run.name === 'AgentExecutor') {
          executorRuns++
          console.log('Found AgentExecutor run:', {
            id: run.id,
            name: run.name,
            tags: run.tags,
            startTime: run.start_time,
            endTime: run.end_time,
            inputs: run.inputs,
            outputs: run.outputs,
            error: run.error,
            extra: run.extra
          })
        }
      }
      
      console.log(`Found ${executorRuns} AgentExecutor runs out of ${runCount} total runs`)

      // For now, return empty metrics
      return NextResponse.json({
        averageLatency: 0,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        totalCost: 0,
        executorRuns,
        totalRuns: runCount
      })
    } catch (err) {
      console.error('Error during run fetching:', err)
      if (err instanceof Error) {
        console.error('Error details:', err.message)
      }
      throw err
    }
  } catch (error) {
    console.error('Error processing LangSmith metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch LangSmith metrics' },
      { status: 500 }
    )
  }
} 