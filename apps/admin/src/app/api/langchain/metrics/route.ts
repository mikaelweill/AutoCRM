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
      apiUrl: process.env.LANGSMITH_API_URL,
      apiKey: process.env.LANGSMITH_API_KEY,
    })

    // Fetch runs for the given trace IDs
    const runs = await Promise.all(
      traceIds.map(id => client.readRun(id))
    )

    // Calculate metrics
    const initialMetrics: MetricsAccumulator = {
      totalLatency: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      totalCost: 0,
    }

    const metrics = runs.reduce((acc: MetricsAccumulator, run: Run) => {
      if (!run) return acc

      // Add latency (end_time - start_time in milliseconds)
      const startTime = run.start_time ? new Date(run.start_time).getTime() : 0
      const endTime = run.end_time ? new Date(run.end_time).getTime() : 0
      acc.totalLatency += endTime - startTime

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

      return acc
    }, initialMetrics)

    return NextResponse.json({
      averageLatency: metrics.totalLatency / runs.length,
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