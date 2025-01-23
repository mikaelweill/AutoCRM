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
  ticket: {
    id: string
    number: number
    subject: string
    client: {
      name: string
      email: string
    }
  }
  user: {
    name: string
    email: string
    role: string
  }
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
    // Get tickets with their associated users
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select(`
        status,
        client_id,
        agent_id
      `)
    
    if (ticketsError) throw ticketsError

    const initialStatus = {
      new: 0,
      in_progress: 0,
      closed: 0,
      cancelled: 0
    }

    const ticketsByStatus = tickets.reduce((acc, ticket: any) => {
      if (ticket.status) {
        acc[ticket.status as keyof typeof initialStatus] = 
          (acc[ticket.status as keyof typeof initialStatus] || 0) + 1
      }
      return acc
    }, {...initialStatus})

    // Get unique active agents (those with in_progress tickets)
    const activeAgentIds = new Set(
      tickets
        .filter((t: any) => t.status === 'in_progress' && t.agent_id)
        .map((t: any) => t.agent_id)
    )

    // Get unique active clients (those with new or in_progress tickets)
    const activeClientIds = new Set(
      tickets
        .filter((t: any) => (t.status === 'new' || t.status === 'in_progress'))
        .map((t: any) => t.client_id)
    )

    return {
      totalTickets: tickets.length,
      ticketsByStatus,
      activeAgents: activeAgentIds.size,
      activeClients: activeClientIds.size
    }
  }

  async function fetchAgentStats(): Promise<AgentStats[]> {
    // First get all agents
    const { data: agents, error: agentsError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        tickets!agent_id(status)
      `)
      .eq('role', 'agent')

    if (agentsError) throw agentsError

    console.log('Raw agent data:', agents) // Debug log

    // For each agent, get their most recent activity
    const agentsWithActivity = await Promise.all(
      agents.map(async (agent: any) => {
        // Get latest ticket activity
        const { data: latestActivity } = await supabase
          .from('ticket_activities')
          .select('created_at')
          .eq('user_id', agent.id)
          .order('created_at', { ascending: false })
          .limit(1)

        // Get latest ticket assignment
        const { data: latestTicket } = await supabase
          .from('tickets')
          .select('updated_at')
          .eq('agent_id', agent.id)
          .order('updated_at', { ascending: false })
          .limit(1)

        // Compare timestamps to get the most recent activity
        const activityTime = latestActivity?.[0]?.created_at as string | undefined
        const ticketTime = latestTicket?.[0]?.updated_at as string | undefined
        let lastActive = 'Never'

        if (activityTime && ticketTime) {
          lastActive = new Date(activityTime) > new Date(ticketTime) ? activityTime : ticketTime
        } else if (activityTime) {
          lastActive = activityTime
        } else if (ticketTime) {
          lastActive = ticketTime
        }

        return {
          id: agent.id,
          name: agent.full_name || agent.email.split('@')[0] || 'Unnamed Agent',
          email: agent.email,
          activeTickets: agent.tickets?.filter((t: any) => t.status === 'in_progress').length || 0,
          totalTickets: agent.tickets?.length || 0,
          lastActive
        }
      })
    )

    return agentsWithActivity
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
        tickets!ticket_id(
          id,
          number,
          subject,
          client:client_id(email, full_name)
        ),
        users!user_id(id, email, full_name, role)
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    if (activitiesError) throw activitiesError

    return activities.map((activity: any) => {
      // Process the content based on activity type
      let processedContent = activity.content
      const userName = activity.users.full_name || activity.users.email

      if (activity.content === 'Ticket unassigned from agent') {
        processedContent = `Ticket unassigned from agent: ${userName}`
      } else if (activity.content === 'Ticket assigned to agent') {
        processedContent = `Ticket assigned to agent: ${userName}`
      } else {
        processedContent = `${userName} commented: ${activity.content}`
      }

      return {
        id: activity.id,
        type: activity.activity_type,
        content: processedContent,
        timestamp: activity.created_at,
        metadata: activity.metadata,
        ticket: {
          id: activity.tickets.id,
          number: activity.tickets.number,
          subject: activity.tickets.subject,
          client: {
            name: activity.tickets.client.full_name || activity.tickets.client.email,
            email: activity.tickets.client.email
          }
        },
        user: {
          name: activity.users.full_name || activity.users.email,
          email: activity.users.email,
          role: activity.users.role
        }
      }
    })
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

      {/* Recent Activity */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Recent Activity</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Activity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ticket
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activities.map(activity => (
                <tr key={activity.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-sm text-gray-900">{activity.content}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">#{activity.ticket.number}</div>
                      <div className="text-gray-500">{activity.ticket.subject}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">{activity.ticket.client.name}</div>
                      <div className="text-gray-500">{activity.ticket.client.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">{activity.user.name}</div>
                      <div className="text-gray-500">{activity.user.role}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(activity.timestamp).toLocaleString()}
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