'use client'

import { useState, useEffect } from 'react'
import { createClient } from 'shared/src/lib/supabase'
import { format } from 'date-fns'

interface FunnelMetrics {
  totalInvocations: number
  successfulInteractions: number
  failedInteractions: number
  notRatedInteractions: number
}

interface Interaction {
  id: string
  created_at: string
  success: boolean | null
  content: string
  agent: {
    email: string
    full_name: string | null
  } | null
}

interface LangChainMetrics {
  averageLatency: number
  totalTokens: number
  totalCost: number
  completionTokens: number
  promptTokens: number
}

interface ChatMessage {
  id: string
  created_at: string
  success: boolean | null
  content: string
  agent_id: string | null
  langsmith_trace_id: string | null
}

const PAGE_SIZE = 10 // Number of items per page

export default function AIAnalyticsPage() {
  const [funnelMetrics, setFunnelMetrics] = useState<FunnelMetrics>({
    totalInvocations: 0,
    successfulInteractions: 0,
    failedInteractions: 0,
    notRatedInteractions: 0
  })
  const [langChainMetrics, setLangChainMetrics] = useState<LangChainMetrics>({
    averageLatency: 0,
    totalTokens: 0,
    totalCost: 0,
    completionTokens: 0,
    promptTokens: 0
  })
  const [recentInteractions, setRecentInteractions] = useState<Interaction[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    fetchAnalytics()
  }, [currentPage]) // Refetch when page changes

  async function fetchLangChainMetrics(traceIds: string[]) {
    try {
      // Call your API endpoint that interfaces with LangSmith
      const response = await fetch('/api/langchain/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ traceIds }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch LangChain metrics')
      }

      const metrics = await response.json()
      setLangChainMetrics(metrics)
    } catch (error) {
      console.error('Error fetching LangChain metrics:', error)
    }
  }

  async function fetchAnalytics() {
    const supabase = createClient()

    // First get total count for pagination
    const { count } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })

    if (count !== null) {
      setTotalCount(count)
    }

    // Get all messages for global metrics (without pagination)
    const { data: allMessages, error: metricsError } = await supabase
      .from('chat_messages')
      .select('success, langsmith_trace_id')

    if (metricsError) {
      console.error('Error fetching metrics:', metricsError)
      return
    }

    // Calculate global metrics from all messages
    const metrics = {
      totalInvocations: allMessages?.length || 0,
      successfulInteractions: allMessages?.filter(m => m.success === true).length || 0,
      failedInteractions: allMessages?.filter(m => m.success === false).length || 0,
      notRatedInteractions: allMessages?.filter(m => m.success === null).length || 0
    }

    setFunnelMetrics(metrics)

    // Get trace IDs for LangChain metrics
    const traceIds = allMessages
      ?.filter(m => m.langsmith_trace_id)
      .map(m => m.langsmith_trace_id as string) || []

    if (traceIds.length > 0) {
      await fetchLangChainMetrics(traceIds)
    }

    // Then get paginated data for the table
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select(`
        id,
        created_at,
        success,
        content,
        agent_id
      `)
      .order('created_at', { ascending: false })
      .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1)
      .returns<ChatMessage[]>()

    if (error) {
      console.error('Error fetching analytics:', error)
      return
    }

    if (!messages) {
      setLoading(false)
      return
    }

    // Get agent details for messages that have an agent_id
    const agentIds = messages.filter(m => m.agent_id).map(m => m.agent_id)
    
    let agentDetails: Record<string, { email: string, full_name: string | null }> = {}
    
    if (agentIds.length > 0) {
      const { data: agents } = await supabase
        .from('users')
        .select('id, email, full_name')
        .in('id', agentIds)
        .returns<{ id: string, email: string, full_name: string | null }[]>()

      if (agents) {
        agentDetails = agents.reduce((acc, agent) => ({
          ...acc,
          [agent.id]: { email: agent.email, full_name: agent.full_name }
        }), {} as Record<string, { email: string, full_name: string | null }>)
      }
    }

    // Combine messages with agent details
    const messagesWithAgents: Interaction[] = messages.map(msg => ({
      id: msg.id,
      created_at: msg.created_at,
      success: msg.success,
      content: msg.content,
      agent: msg.agent_id ? agentDetails[msg.agent_id] : null
    }))

    setRecentInteractions(messagesWithAgents)
    setLoading(false)
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">AI Assistant Analytics</h1>
      
      {/* Funnel Analytics */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Interaction Funnel</h2>
        <div className="space-y-4">
          {/* First Row: Rated vs Not Rated */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-gray-500 text-sm font-medium">Rated Interactions</h3>
              <p className="text-3xl font-bold mt-2">
                {funnelMetrics.successfulInteractions + funnelMetrics.failedInteractions}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {(((funnelMetrics.successfulInteractions + funnelMetrics.failedInteractions) / funnelMetrics.totalInvocations) * 100).toFixed(1)}% of total
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-gray-500 text-sm font-medium">Not Rated</h3>
              <p className="text-3xl font-bold mt-2">{funnelMetrics.notRatedInteractions}</p>
              <p className="text-sm text-gray-500 mt-1">
                {((funnelMetrics.notRatedInteractions / funnelMetrics.totalInvocations) * 100).toFixed(1)}% of total
              </p>
            </div>
          </div>

          {/* Second Row: Success vs Failure (of rated) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-gray-500 text-sm font-medium">Successful</h3>
              <p className="text-3xl font-bold mt-2">{funnelMetrics.successfulInteractions}</p>
              <p className="text-sm text-gray-500 mt-1">
                {((funnelMetrics.successfulInteractions / (funnelMetrics.successfulInteractions + funnelMetrics.failedInteractions)) * 100).toFixed(1)}% of rated
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-gray-500 text-sm font-medium">Failed</h3>
              <p className="text-3xl font-bold mt-2">{funnelMetrics.failedInteractions}</p>
              <p className="text-sm text-gray-500 mt-1">
                {((funnelMetrics.failedInteractions / (funnelMetrics.successfulInteractions + funnelMetrics.failedInteractions)) * 100).toFixed(1)}% of rated
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Interactions Table */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Recent Interactions</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Agent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Message
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentInteractions.map((interaction) => (
                <tr key={interaction.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(interaction.created_at), 'MMM d, h:mm a')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {interaction.agent ? (interaction.agent.full_name || interaction.agent.email) : 'No Agent'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="max-w-lg truncate" title={interaction.content}>
                      {interaction.content}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {interaction.success === null ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                        Not Rated
                      </span>
                    ) : interaction.success ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Success
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        Failed
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* Pagination Controls */}
          <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
            <div className="flex-1 flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-700">
                  Showing{' '}
                  <span className="font-medium">{currentPage * PAGE_SIZE + 1}</span>{' '}
                  to{' '}
                  <span className="font-medium">
                    {Math.min((currentPage + 1) * PAGE_SIZE, totalCount)}
                  </span>{' '}
                  of{' '}
                  <span className="font-medium">{totalCount}</span>{' '}
                  results
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                    currentPage === 0
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage >= totalPages - 1}
                  className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                    currentPage >= totalPages - 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* LangChain Metrics */}
      <section>
        <h2 className="text-xl font-semibold mb-4">LangChain Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-medium">Average Response Time</h3>
            <p className="text-3xl font-bold mt-2">{(langChainMetrics.averageLatency / 1000).toFixed(2)}s</p>
            <p className="text-sm text-gray-500 mt-1">Across all interactions</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-medium">Total Token Usage</h3>
            <p className="text-3xl font-bold mt-2">{langChainMetrics.totalTokens.toLocaleString()}</p>
            <p className="text-sm text-gray-500 mt-1">
              {langChainMetrics.promptTokens.toLocaleString()} prompt + {langChainMetrics.completionTokens.toLocaleString()} completion
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-medium">Estimated Cost</h3>
            <p className="text-3xl font-bold mt-2">${langChainMetrics.totalCost.toFixed(2)}</p>
            <p className="text-sm text-gray-500 mt-1">Based on OpenAI pricing</p>
          </div>
        </div>
      </section>
    </div>
  )
} 