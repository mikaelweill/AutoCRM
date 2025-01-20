'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Ticket, getTickets } from '@/services/tickets'
import { TICKET_PRIORITIES } from '@/config/tickets'

export function TicketList() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Initial fetch
    fetchTickets()

    // Set up real-time subscription
    const supabase = createClient()
    
    const channel = supabase
      .channel('tickets')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets'
        },
        async () => {
          // Refetch tickets when any change occurs
          await fetchTickets()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchTickets() {
    try {
      const data = await getTickets()
      setTickets(data)
      setError(null)
    } catch (err) {
      setError('Failed to fetch tickets')
      console.error('Error fetching tickets:', err)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <div className="text-center py-8">Loading tickets...</div>
  }

  if (error) {
    return <div className="text-center py-8 text-red-600">{error}</div>
  }

  if (!tickets.length) {
    return (
      <div className="text-center py-8 text-gray-500">
        No tickets found. Create your first ticket to get started.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {tickets.map((ticket) => (
        <div
          key={ticket.id}
          className="bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                #{ticket.number} {ticket.subject}
              </h3>
              <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                {ticket.description}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`${
                  TICKET_PRIORITIES.find((p) => p.value === ticket.priority)?.color
                } px-2.5 py-0.5 rounded-full text-sm font-medium`}
              >
                {ticket.priority}
              </span>
              <span
                className={`${
                  ticket.status === 'new'
                    ? 'bg-blue-50 text-blue-700'
                    : ticket.status === 'in_progress'
                    ? 'bg-yellow-50 text-yellow-700'
                    : ticket.status === 'resolved'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-gray-50 text-gray-700'
                } px-2.5 py-0.5 rounded-full text-sm font-medium`}
              >
                {ticket.status.replace('_', ' ')}
              </span>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center gap-4">
              <span>
                Created by:{' '}
                {ticket.client.full_name || ticket.client.email || 'Unknown'}
              </span>
              {ticket.agent_id && (
                <span>
                  Assigned to:{' '}
                  {ticket.agent?.full_name || ticket.agent?.email || 'Unknown'}
                </span>
              )}
            </div>
            <span>
              {new Date(ticket.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
} 