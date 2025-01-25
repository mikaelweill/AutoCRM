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
  const supabase = createClient()

  useEffect(() => {
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

    fetchStats()

    // Set up real-time subscription
    const channel = supabase
      .channel('tickets-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets'
        },
        () => {
          console.log('Ticket change detected, refreshing stats...')
          fetchStats()
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to tickets changes')
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, []) // Empty dependency array since supabase client is stable

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Agent Dashboard</h1>
      </div>

      {error ? (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="Total Open Tickets"
            value={stats?.totalOpenTickets ?? 0}
            icon="🎫"
          />
          <StatCard
            title="High Priority"
            value={stats?.highPriorityTickets ?? 0}
            icon="🔥"
          />
          <StatCard
            title="My Active Tickets"
            value={stats?.myActiveTickets ?? 0}
            icon="👤"
          />
        </div>
      )}
    </div>
  )
} 