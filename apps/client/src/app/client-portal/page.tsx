'use client'

import { useEffect, useState } from 'react'
import { createClient } from 'shared/src/lib/supabase'
import { ClientDashboardStats, getClientDashboardStats } from 'shared/src/services/tickets'

interface StatCardProps {
  title: string
  value: string | number
  icon: string
  description?: string
}

function StatCard({ title, value, icon, description }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900 mt-2">{value}</p>
          {description && (
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          )}
        </div>
        <div className="text-2xl">{icon}</div>
      </div>
    </div>
  )
}

export default function ClientDashboard() {
  const [stats, setStats] = useState<ClientDashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    
    async function fetchStats() {
      try {
        const data = await getClientDashboardStats()
        setStats(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch stats')
      } finally {
        setLoading(false)
      }
    }

    // Initial fetch
    fetchStats()

    // Set up real-time subscription for updates
    const channel = supabase
      .channel('public:tickets')
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

    channel.subscribe((status) => {
      console.log('Subscription status:', status)
      if (status === 'SUBSCRIBED') {
        console.log('Successfully subscribed to tickets changes')
      }
    })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-8">Dashboard</h1>
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
        <h1 className="text-2xl font-semibold text-gray-900 mb-8">Dashboard</h1>
        <div className="text-red-500">Error loading stats: {error}</div>
      </div>
    )
  }

  const formatHours = (hours: number | null) => {
    if (!hours) return 'N/A'
    return hours < 24 ? `${hours}h` : `${Math.round(hours / 24)}d`
  }

  const statCards = [
    { 
      title: 'Active Tickets', 
      value: stats?.totalActiveTickets ?? 0, 
      icon: '🎫',
      description: 'Currently open or in progress'
    },
    { 
      title: 'Recent Updates', 
      value: stats?.recentlyUpdatedTickets ?? 0, 
      icon: '🔄',
      description: 'Updated in last 24 hours'
    },
    { 
      title: 'Avg. Resolution Time', 
      value: formatHours(stats?.averageResolutionHours ?? null), 
      icon: '⏱️',
      description: 'Based on last 30 days'
    },
    { 
      title: 'Priority Breakdown', 
      value: `${stats?.ticketsByPriority.high ?? 0} High`, 
      icon: '🔥',
      description: `${stats?.ticketsByPriority.medium ?? 0} Med, ${stats?.ticketsByPriority.low ?? 0} Low`
    },
  ]

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-8">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <StatCard
            key={index}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            description={stat.description}
          />
        ))}
      </div>
    </div>
  )
} 