'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'
import { Ticket, assignTicket } from '../../services/tickets'
import { getPriorityDetails, getStatusDetails } from '../../config/tickets'
import { Button } from '../ui'

export function TicketQueue() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    // Initial fetch of unassigned tickets
    async function fetchUnassignedTickets() {
      try {
        const { data, error } = await supabase
          .from('tickets')
          .select(`
            *,
            client:client_id(id, email, full_name, role),
            agent:agent_id(id, email, full_name, role),
            attachments(*)
          `)
          .is('agent_id', null)
          .eq('status', 'new')
          .order('created_at', { ascending: false })

        if (error) throw error

        // Cast through unknown first
        const ticketsData = data as unknown
        // Now cast to Ticket[] and filter valid tickets
        const validTickets = (ticketsData as any[]).filter((ticket): ticket is Ticket => {
          if (!ticket || typeof ticket !== 'object') return false
          const t = ticket as Partial<Ticket>
          const isValid = typeof t.id === 'string' &&
            typeof t.number === 'number' &&
            typeof t.subject === 'string' &&
            typeof t.description === 'string' &&
            typeof t.status === 'string' &&
            typeof t.priority === 'string' &&
            typeof t.client_id === 'string' &&
            (t.agent_id === null || typeof t.agent_id === 'string') &&
            typeof t.created_at === 'string' &&
            typeof t.updated_at === 'string'
          
          if (!isValid) {
            console.warn('Invalid ticket data:', ticket)
          }
          return isValid
        })

        setTickets(validTickets)
      } catch (err) {
        console.error('Error fetching tickets:', err)
        setError('Failed to load tickets')
      } finally {
        setLoading(false)
      }
    }

    // Subscribe to changes
    const channel = supabase
      .channel('ticket-queue')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets'
        },
        () => {
          fetchUnassignedTickets()
        }
      )
      .subscribe()

    fetchUnassignedTickets()

    return () => {
      channel.unsubscribe()
    }
  }, [])

  const handleAssign = async (ticketId: string) => {
    try {
      await assignTicket(ticketId)
      // Ticket will be removed from list automatically via subscription
    } catch (err) {
      console.error('Error assigning ticket:', err)
      setError('Failed to assign ticket')
    }
  }

  if (loading) {
    return <div className="flex justify-center p-4">Loading...</div>
  }

  if (error) {
    return <div className="text-red-500">{error}</div>
  }

  if (!tickets.length) {
    return <div className="text-gray-500">No unassigned tickets</div>
  }

  return (
    <div className="space-y-4">
      {tickets.map((ticket) => {
        const priorityDetails = getPriorityDetails(ticket.priority)
        const statusDetails = getStatusDetails(ticket.status)
        
        return (
          <div key={ticket.id} className="bg-white shadow rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium">
                  #{ticket.number} - {ticket.subject}
                </h3>
                <div className="mt-1 text-sm text-gray-500">
                  From: {ticket.client?.full_name || ticket.client?.email || 'Unknown'}
                </div>
                <div className="mt-2 space-x-2">
                  <span
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    style={{ backgroundColor: priorityDetails?.color || '#e5e7eb' }}
                  >
                    {priorityDetails?.label || ticket.priority}
                  </span>
                  <span
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    style={{ backgroundColor: statusDetails?.color || '#e5e7eb' }}
                  >
                    {statusDetails?.label || ticket.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-700">{ticket.description}</p>
              </div>
              <Button
                onClick={() => handleAssign(ticket.id)}
                className="ml-4"
              >
                Assign to Me
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
} 