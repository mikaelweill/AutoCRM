'use client'

import { useState, useEffect } from 'react'
import { createClient } from 'shared/src/lib/supabase'
import { format } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface MessageRun {
  id: string
  message_id: string
  created_at: string
  success: boolean | null
  status: string | null
  duration_ms: number | null
  latency: number | null
  cost: number | null
  total_tokens: number | null
  error_type: string | null
  error_message: string | null
  token_usage: {
    completion_tokens?: number
    prompt_tokens?: number
    total_tokens?: number
  } | null
  actions: any[] | null
  original_prompt?: string
}

interface PerformanceMetrics {
  totalRuns: number
  successRate: number
  averageLatency: number
  averageDuration: number
  totalCost: number
  totalTokens: number
  errorRate: number
}

interface TokenMetrics {
  totalPromptTokens: number
  totalCompletionTokens: number
  averageTokensPerRun: number
}

const PAGE_SIZE = 10

export default function AIAnalyticsPage() {
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    totalRuns: 0,
    successRate: 0,
    averageLatency: 0,
    averageDuration: 0,
    totalCost: 0,
    totalTokens: 0,
    errorRate: 0
  })
  const [tokenMetrics, setTokenMetrics] = useState<TokenMetrics>({
    totalPromptTokens: 0,
    totalCompletionTokens: 0,
    averageTokensPerRun: 0
  })
  const [recentRuns, setRecentRuns] = useState<MessageRun[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [timeSeriesData, setTimeSeriesData] = useState<any[]>([])

  useEffect(() => {
    fetchAnalytics()
  }, [currentPage])

  async function fetchAnalytics() {
    const supabase = createClient()

    // Get total count for pagination
    const { count } = await supabase
      .from('message_runs')
      .select('*', { count: 'exact', head: true })

    if (count !== null) {
      setTotalCount(count)
    }

    // Fetch all runs for metrics calculation
    const { data: allRuns, error: metricsError } = await supabase
      .from('message_runs')
      .select('*')
      .order('created_at', { ascending: false })
      .returns<MessageRun[]>()

    if (metricsError) {
      console.error('Error fetching metrics:', metricsError)
      return
    }

    if (!allRuns) {
      setLoading(false)
      return
    }

    // Calculate performance metrics
    const metrics = {
      totalRuns: allRuns.length,
      successRate: (allRuns.filter(run => run.success === true).length / allRuns.length) * 100,
      averageLatency: allRuns.reduce((acc, run) => acc + (run.latency || 0), 0) / allRuns.length,
      averageDuration: allRuns.reduce((acc, run) => acc + (run.duration_ms || 0), 0) / allRuns.length,
      totalCost: allRuns.reduce((acc, run) => acc + (run.cost || 0), 0),
      totalTokens: allRuns.reduce((acc, run) => acc + (run.total_tokens || 0), 0),
      errorRate: (allRuns.filter(run => run.error_type !== null).length / allRuns.length) * 100
    }

    // Calculate token metrics
    const tokenMetrics = {
      totalPromptTokens: allRuns.reduce((acc, run) => acc + (run.token_usage?.prompt_tokens || 0), 0),
      totalCompletionTokens: allRuns.reduce((acc, run) => acc + (run.token_usage?.completion_tokens || 0), 0),
      averageTokensPerRun: allRuns.reduce((acc, run) => acc + (run.total_tokens || 0), 0) / allRuns.length
    }

    // Calculate time series data for the last 7 days
    const timeSeriesData = calculateTimeSeriesData(allRuns)

    setPerformanceMetrics(metrics)
    setTokenMetrics(tokenMetrics)
    setTimeSeriesData(timeSeriesData)

    // Fetch paginated recent runs
    const { data: paginatedRuns, error: paginationError } = await supabase
      .from('message_runs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1)
      .returns<MessageRun[]>()

    if (paginationError) {
      console.error('Error fetching paginated runs:', paginationError)
      return
    }

    setRecentRuns(paginatedRuns || [])
    setLoading(false)
  }

  function calculateTimeSeriesData(runs: MessageRun[]) {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - i)
      return format(date, 'MMM dd')
    }).reverse()

    return last7Days.map(date => {
      const dayRuns = runs.filter(run => 
        format(new Date(run.created_at), 'MMM dd') === date
      )
      return {
        date,
        runs: dayRuns.length,
        successRate: dayRuns.length > 0
          ? (dayRuns.filter(run => run.success === true).length / dayRuns.length) * 100
          : 0
      }
    })
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
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
      
      {/* Performance Metrics */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium">Success Rate</h3>
          <p className="text-3xl font-bold mt-2">{performanceMetrics.successRate.toFixed(1)}%</p>
          <p className="text-sm text-gray-500 mt-1">
            From {performanceMetrics.totalRuns} total runs
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium">Average Response Time</h3>
          <p className="text-3xl font-bold mt-2">{(performanceMetrics.averageLatency || 0).toLocaleString()}ms</p>
          <p className="text-sm text-gray-500 mt-1">Latency per request</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium">Total Cost</h3>
          <p className="text-3xl font-bold mt-2">${performanceMetrics.totalCost.toFixed(2)}</p>
          <p className="text-sm text-gray-500 mt-1">All-time spending</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium">Error Rate</h3>
          <p className="text-3xl font-bold mt-2">{performanceMetrics.errorRate.toFixed(1)}%</p>
          <p className="text-sm text-gray-500 mt-1">Failed executions</p>
        </div>
      </section>

      {/* Token Usage */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Token Usage</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <h3 className="text-gray-500 text-sm font-medium">Total Prompt Tokens</h3>
            <p className="text-2xl font-bold mt-1">{tokenMetrics.totalPromptTokens.toLocaleString()}</p>
          </div>
          <div>
            <h3 className="text-gray-500 text-sm font-medium">Total Completion Tokens</h3>
            <p className="text-2xl font-bold mt-1">{tokenMetrics.totalCompletionTokens.toLocaleString()}</p>
          </div>
          <div>
            <h3 className="text-gray-500 text-sm font-medium">Average Tokens/Run</h3>
            <p className="text-2xl font-bold mt-1">{Math.round(tokenMetrics.averageTokensPerRun).toLocaleString()}</p>
          </div>
        </div>
      </section>

      {/* Performance Trends */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">7-Day Performance Trend</h2>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip 
                formatter={(value, name) => {
                  if (name === 'Success Rate %') return `${value}%`;
                  return value;
                }}
              />
              <Bar yAxisId="left" dataKey="runs" fill="#4F46E5" name="Total Runs" />
              <Bar yAxisId="right" dataKey="successRate" fill="#10B981" name="Success Rate %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Recent Runs Table */}
      <section className="bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold p-6 border-b">Recent Runs</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tokens</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Original Prompt</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tools Used</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Error</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentRuns.map((run) => {
                // Extract tool usage information
                const toolsUsed = run.actions?.map(action => {
                  if (typeof action === 'object' && action.tool) {
                    return action.tool;
                  }
                  return null;
                }).filter(Boolean);

                return (
                  <tr key={run.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(run.created_at || ''), 'MMM dd, HH:mm:ss')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        run.success 
                          ? 'bg-green-100 text-green-800'
                          : run.success === false
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {run.status || (run.success ? 'Success' : 'Failed')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {run.duration_ms ? `${run.duration_ms.toLocaleString()}ms` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {run.total_tokens?.toLocaleString() || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {run.cost ? `$${run.cost.toFixed(4)}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-md">
                      <div className="truncate" title={run.original_prompt || ''}>
                        {run.original_prompt || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {toolsUsed?.length ? (
                        <div className="flex flex-wrap gap-1">
                          {toolsUsed.map((tool, idx) => (
                            <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              {tool}
                            </span>
                          ))}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-500">
                      {run.error_message || '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="px-6 py-4 border-t">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">
              Page {currentPage + 1} of {Math.ceil(totalCount / PAGE_SIZE)}
            </span>
            <button
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={currentPage >= Math.ceil(totalCount / PAGE_SIZE) - 1}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  )
} 