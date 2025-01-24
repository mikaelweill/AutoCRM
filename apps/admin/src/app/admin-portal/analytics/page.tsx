'use client'

import { useState, useEffect } from 'react'
import { createClient } from 'shared/src/lib/supabase'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, ResponsiveContainer, Cell } from 'recharts'
import { TICKET_PRIORITIES, TICKET_STATUSES } from 'shared/src/config/tickets'

interface DatabaseTicket {
  status: string
  priority: string
  created_at: string
}

interface TicketStatusData {
  status: string
  count: number
  percentage: number
  color: string
}

interface TicketPriorityData {
  priority: string
  count: number
  percentage: number
  color: string
}

interface TicketTimelineData {
  date: string
  count: number
}

export default function AnalyticsPage() {
  const [statusData, setStatusData] = useState<TicketStatusData[]>([])
  const [priorityData, setPriorityData] = useState<TicketPriorityData[]>([])
  const [timelineData, setTimelineData] = useState<TicketTimelineData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClient()

  useEffect(() => {
    fetchAnalyticsData()
  }, [])

  async function fetchAnalyticsData() {
    try {
      const [statusStats, priorityStats, timelineStats] = await Promise.all([
        fetchTicketsByStatus(),
        fetchTicketsByPriority(),
        fetchTicketsTimeline()
      ])

      setStatusData(statusStats)
      setPriorityData(priorityStats)
      setTimelineData(timelineStats)
      setError(null)
    } catch (err) {
      console.error('Error fetching analytics data:', err)
      setError('Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }

  // Helper function to get color from Tailwind class
  function getColorFromTailwindClass(colorClass: string): string {
    // Extract color from classes like "bg-green-100 text-green-800"
    const matches = colorClass.match(/bg-(\w+)-\d+/)
    if (!matches) return '#6b7280' // Default gray
    
    // Map Tailwind color names to hex colors
    const colorMap: { [key: string]: string } = {
      green: '#22c55e',
      yellow: '#eab308',
      red: '#ef4444',
      purple: '#a855f7',
      blue: '#3b82f6',
      gray: '#6b7280'
    }
    
    return colorMap[matches[1]] || '#6b7280'
  }

  async function fetchTicketsByStatus(): Promise<TicketStatusData[]> {
    const { data: tickets, error } = await supabase
      .from('tickets')
      .select('status')
      .returns<Pick<DatabaseTicket, 'status'>[]>()

    if (error) throw error
    if (!tickets) return []

    const statusCounts = tickets.reduce<{ [key: string]: number }>((acc, ticket) => {
      acc[ticket.status] = (acc[ticket.status] || 0) + 1
      return acc
    }, {})

    const total = tickets.length

    // Initialize counts for all possible statuses
    const allStatusData = TICKET_STATUSES.map(status => ({
      status: status.label,
      count: statusCounts[status.value] || 0,
      percentage: ((statusCounts[status.value] || 0) / total) * 100,
      color: getColorFromTailwindClass(status.color)
    }))

    return allStatusData
  }

  async function fetchTicketsByPriority(): Promise<TicketPriorityData[]> {
    const { data: tickets, error } = await supabase
      .from('tickets')
      .select('priority, status')
      .in('status', ['new', 'in_progress'])
      .returns<Pick<DatabaseTicket, 'priority' | 'status'>[]>()

    if (error) throw error
    if (!tickets) return []

    const priorityCounts = tickets.reduce<{ [key: string]: number }>((acc, ticket) => {
      acc[ticket.priority] = (acc[ticket.priority] || 0) + 1
      return acc
    }, {})

    const total = tickets.length

    // Initialize counts for all possible priorities
    const allPriorityData = TICKET_PRIORITIES.map(priority => ({
      priority: priority.label,
      count: priorityCounts[priority.value] || 0,
      percentage: ((priorityCounts[priority.value] || 0) / total) * 100,
      color: getColorFromTailwindClass(priority.color)
    }))

    return allPriorityData
  }

  async function fetchTicketsTimeline(): Promise<TicketTimelineData[]> {
    const { data: tickets, error } = await supabase
      .from('tickets')
      .select('created_at')
      .order('created_at', { ascending: true })
      .returns<Pick<DatabaseTicket, 'created_at'>[]>()

    if (error) throw error
    if (!tickets) return []

    // Group tickets by date
    const dailyCounts: { [key: string]: number } = {}
    tickets.forEach((ticket) => {
      const date = new Date(ticket.created_at).toISOString().split('T')[0]
      dailyCounts[date] = (dailyCounts[date] || 0) + 1
    })

    return Object.entries(dailyCounts).map(([date, count]) => ({
      date,
      count
    }))
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold">Analytics</h1>

      {/* Tickets by Status */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Ticket Distribution by Status</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" />
              <YAxis label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft' }} />
              <Tooltip 
                formatter={(value: number) => [`${value.toFixed(1)}%`, 'Percentage']}
              />
              <Legend />
              <Bar 
                dataKey="percentage" 
                name="Percentage of Tickets"
              >
                {
                  statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))
                }
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Active Tickets by Priority */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Active Tickets by Priority</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={priorityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="priority" />
              <YAxis label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft' }} />
              <Tooltip 
                formatter={(value: number) => [`${value.toFixed(1)}%`, 'Percentage']}
              />
              <Legend />
              <Bar 
                dataKey="percentage" 
                name="Percentage of Active Tickets"
              >
                {
                  priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))
                }
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Tickets Creation Timeline */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Daily Ticket Creation</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(date: string) => new Date(date).toLocaleDateString()}
              />
              <YAxis label={{ value: 'Number of Tickets', angle: -90, position: 'insideLeft' }} />
              <Tooltip 
                labelFormatter={(date: string) => new Date(date).toLocaleDateString()}
                formatter={(value: number) => [value, 'Tickets Created']}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke="#2563eb" 
                name="New Tickets"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  )
} 