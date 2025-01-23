'use client'

import { useState, useEffect } from 'react'
import { createClient } from 'shared/src/lib/supabase'
import { User } from '@supabase/supabase-js'

interface OverviewStats {
  totalTickets: number
  ticketsByStatus: {
    new: number
    in_progress: number
    closed: number
    cancelled: number
  }
  activeAgents: number
  activeClients: number
}

interface AgentStats {
  id: string
  name: string
  email: string
  activeTickets: number
  totalTickets: number
  lastActive: string
}

interface ActivityItem {
  id: string
  type: 'ticket_created' | 'status_change' | 'agent_assigned'
  content: string
  timestamp: string
  metadata: any
}

export default function AdminPortal() {
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [agents, setAgents] = useState<AgentStats[]>([])
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClient()

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    try {
      const [overviewStats, agentStats, recentActivities] = await Promise.all([
        fetchOverviewStats(),
        fetchAgentStats(),
        fetchRecentActivities()
      ])

      setStats(overviewStats)
      setAgents(agentStats)
      setActivities(recentActivities)
      setError(null)
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  async function fetchOverviewStats(): Promise<OverviewStats> {
    // Get tickets count by status
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select('status')
    
    if (ticketsError) throw ticketsError

    // Get active users count
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('role, last_seen')
      .gte('last_seen', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    if (usersError) throw usersError

    const ticketsByStatus = tickets.reduce((acc: any, ticket) => {
      acc[ticket.status] = (acc[ticket.status] || 0) + 1
      return acc
    }, { new: 0, in_progress: 0, closed: 0, cancelled: 0 })

    return {
      totalTickets: tickets.length,
      ticketsByStatus,
      activeAgents: users.filter(u => u.role === 'agent').length,
      activeClients: users.filter(u => u.role === 'client').length
    }
  }

  async function fetchAgentStats(): Promise<AgentStats[]> {
    const { data: agents, error: agentsError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        last_seen,
        tickets!agent_id(status)
      `)
      .eq('role', 'agent')

    if (agentsError) throw agentsError

    return agents.map((agent: any) => ({
      id: agent.id,
      name: agent.full_name || 'Unnamed Agent',
      email: agent.email,
      activeTickets: agent.tickets?.filter((t: any) => t.status === 'in_progress').length || 0,
      totalTickets: agent.tickets?.length || 0,
      lastActive: agent.last_seen || 'Never'
    }))
  }

  async function fetchRecentActivities(): Promise<ActivityItem[]> {
    const { data: activities, error: activitiesError } = await supabase
      .from('ticket_activities')
      .select(`
        id,
        activity_type,
        content,
        created_at,
        metadata,
        tickets!ticket_id(number),
        users!user_id(email, full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    if (activitiesError) throw activitiesError

    return activities.map((activity: any) => ({
      id: activity.id,
      type: activity.activity_type,
      content: activity.content,
      timestamp: activity.created_at,
      metadata: activity.metadata
    }))
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
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
    <div className="p-6 space-y-6">
      {/* Overview Stats */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-medium">Total Tickets</h3>
            <p className="text-3xl font-bold mt-2">{stats?.totalTickets}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-medium">Active Tickets</h3>
            <p className="text-3xl font-bold mt-2">
              {(stats?.ticketsByStatus.new || 0) + (stats?.ticketsByStatus.in_progress || 0)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-medium">Active Agents</h3>
            <p className="text-3xl font-bold mt-2">{stats?.activeAgents}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-medium">Active Clients</h3>
            <p className="text-3xl font-bold mt-2">{stats?.activeClients}</p>
          </div>
        </div>
      </section>

      {/* Recent Activity */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Recent Activity</h2>
        <div className="bg-white rounded-lg shadow">
          <div className="divide-y">
            {activities.map(activity => (
              <div key={activity.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{activity.content}</p>
                  </div>
                  <span className="text-sm text-gray-400">
                    {new Date(activity.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Agent Performance */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Agent Performance</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Agent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Active Tickets
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Tickets
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Active
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {agents.map(agent => (
                <tr key={agent.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{agent.name}</div>
                      <div className="text-sm text-gray-500">{agent.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {agent.activeTickets}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {agent.totalTickets}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(agent.lastActive).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
} 