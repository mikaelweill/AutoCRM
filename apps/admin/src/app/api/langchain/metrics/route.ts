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

    console.log(`Initializing LangSmith client with:`)
    console.log(`- API URL: https://api.smith.langchain.com`)
    console.log(`- Project: ${process.env.LANGCHAIN_PROJECT}`)
    console.log(`- API Key exists: ${Boolean(process.env.LANGCHAIN_API_KEY)}`)
    
    const client = new Client({
      apiUrl: "https://api.smith.langchain.com",
      apiKey: process.env.LANGCHAIN_API_KEY,
    })

    // First, let's try to list available projects
    console.log('Listing available projects...')
    let projectId = process.env.LANGCHAIN_PROJECT_ID
    
    if (!projectId) {
      try {
        console.log('No project ID in env vars, fetching projects to find ID...')
        for await (const project of client.listProjects()) {
          console.log('Found project:', {
            id: project.id,
            name: project.name
          })
          if (project.name === process.env.LANGCHAIN_PROJECT) {
            projectId = project.id
            console.log('Found our project ID:', projectId)
            break
          }
        }
      } catch (err) {
        console.error('Error listing projects:', err)
      }
    } else {
      console.log('Using project ID from env vars:', projectId)
    }

    // Now try to get runs
    console.log('Testing connection by fetching recent runs...')
    const testRuns: Run[] = []
    try {
      // Try without project filter first
      console.log('Attempting to list any runs without project filter...')
      for await (const run of client.listRuns({ 
        limit: 5
      })) {
        console.log('Found test run:', {
          id: run.id,
          name: run.name,
          tags: run.tags,
          startTime: run.start_time,
          endTime: run.end_time
        })
        testRuns.push(run)
      }
      
      if (testRuns.length === 0 && projectId) {
        // Try with found project ID
        console.log('No runs found without filter, trying with project ID:', projectId)
        for await (const run of client.listRuns({ 
          projectId,
          limit: 5
        })) {
          console.log('Found test run with project ID:', {
            id: run.id,
            name: run.name,
            tags: run.tags,
            startTime: run.start_time,
            endTime: run.end_time
          })
          testRuns.push(run)
        }
      }
    } catch (err) {
      console.error('Error during test run fetching:', err)
    }
    console.log(`Found ${testRuns.length} test runs`)

    // Now try to fetch runs with our trace IDs
    const runs: Run[] = []
    try {
      console.log('Fetching all runs for project:', projectId)
      
      for await (const run of client.listRuns({ 
        projectId,
        limit: 100 // Get a good sample size
      })) {
        console.log('Found run:', {
          id: run.id,
          name: run.name,
          tags: run.tags,
          startTime: run.start_time,
          endTime: run.end_time
        })
        runs.push(run)
      }
    } catch (err) {
      console.error('Error during run fetching:', err)
      if (err instanceof Error) {
        console.error('Error details:', err.message)
      }
    }

    console.log(`Found ${runs.length} total runs`)

    if (runs.length === 0) {
      return NextResponse.json({
        averageLatency: 0,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        totalCost: 0,
      })
    }

    // Calculate metrics
    const initialMetrics = {
      totalLatency: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      totalCost: 0,
    }

    const metrics = runs.reduce((acc, run) => {
      try {
        // Add latency (end_time - start_time in milliseconds)
        const startTime = run.start_time ? new Date(run.start_time).getTime() : 0
        const endTime = run.end_time ? new Date(run.end_time).getTime() : 0
        if (startTime && endTime) {
          acc.totalLatency += endTime - startTime
        }

        // Get token usage from the run
        const tokenUsage = run.extra?.token_usage || {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0
        }

        acc.promptTokens += tokenUsage.prompt_tokens || 0
        acc.completionTokens += tokenUsage.completion_tokens || 0
        acc.totalTokens += tokenUsage.total_tokens || 0

        // Calculate cost (using OpenAI GPT-4 pricing as example)
        // Adjust these rates based on your actual model usage
        acc.totalCost += 
          ((tokenUsage.prompt_tokens || 0) * 0.03 + 
           (tokenUsage.completion_tokens || 0) * 0.06) / 1000

      } catch (err) {
        console.error('Error processing run:', err)
      }
      return acc
    }, initialMetrics)

    const validRuns = runs.filter(run => 
      run.start_time && run.end_time && 
      new Date(run.start_time).getTime() > 0 && 
      new Date(run.end_time).getTime() > 0
    ).length

    return NextResponse.json({
      averageLatency: validRuns > 0 ? metrics.totalLatency / validRuns : 0,
      promptTokens: metrics.promptTokens,
      completionTokens: metrics.completionTokens,
      totalTokens: metrics.totalTokens,
      totalCost: metrics.totalCost,
    })
  } catch (error) {
    console.error('Error processing LangSmith metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch LangSmith metrics' },
      { status: 500 }
    )
  }
} 