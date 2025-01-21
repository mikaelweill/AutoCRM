'use client'

import { useEffect, useState } from 'react'
import { useAuth } from "shared/src/contexts/AuthContext"
import { DashboardStats, getAgentDashboardStats } from 'shared/src/services/tickets'
import { createClient } from 'shared/src/lib/supabase'

interface StatCardProps {
  title: string
  value: number
  icon: string
}

function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900 mt-2">{value}</p>
        </div>
        <div className="text-2xl">{icon}</div>
      </div>
    </div>
  )
}

export default function AgentDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    
    async function fetchStats() {
      try {
        const data = await getAgentDashboardStats()
        setStats(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch stats')
      } finally {
        setLoading(false)
      }
    }

    // Initial fetch
    fetchStats()

    // Set up real-time subscription
    const channel = supabase
      .channel('public:tickets')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events
          schema: 'public',
          table: 'tickets'
        },
        () => {
          console.log('Ticket change detected, refreshing stats...')
          fetchStats()
        }
      )

    console.log('Setting up subscription...')
    channel.subscribe((status) => {
      console.log('Subscription status:', status)
      if (status === 'SUBSCRIBED') {
        console.log('Successfully subscribed to tickets changes')
      }
    })

    return () => {
      console.log('Cleaning up subscription')
      supabase.removeChannel(channel)
    }
  }, [])

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-8">Agent Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-lg h-32 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-8">Agent Dashboard</h1>
        <div className="text-red-500">Error loading stats: {error}</div>
      </div>
    )
  }

  const statCards = [
    { title: 'Total Open Tickets', value: stats?.totalOpenTickets ?? 0, icon: '🎫' },
    { title: 'Unassigned Tickets', value: stats?.unassignedTickets ?? 0, icon: '📥' },
    { title: 'High Priority Tickets', value: stats?.highPriorityTickets ?? 0, icon: '🔥' },
    { title: 'My Active Tickets', value: stats?.myActiveTickets ?? 0, icon: '👤' },
  ]

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-8">Agent Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <StatCard
            key={index}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
          />
        ))}
      </div>
    </div>
  )
} 