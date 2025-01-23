'use client'

import { useState, useEffect } from 'react'
import { Ticket, getMyTickets, unassignTicket, closeTicket, getAttachmentUrl } from 'shared/src/services/tickets'
import { ActionButton } from 'shared/src/components/tickets/TicketTemplate'
import { TicketList } from 'shared/src/components/tickets/TicketList'
import { TICKET_PRIORITIES, TICKET_STATUSES } from 'shared/src/config/tickets'
import { createClient } from 'shared/src/lib/supabase'

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUnassigning, setIsUnassigning] = useState<string | null>(null)
  const [isClosing, setIsClosing] = useState<string | null>(null)

  useEffect(() => {
    fetchTickets()

    const supabase = createClient()
    
    // Subscribe to ticket changes
    const channel = supabase
      .channel('my-tickets-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets'
        },
        () => {
          console.log('Tickets updated, refreshing...')
          fetchTickets()
        }
      )
      .subscribe()

    // Cleanup subscription
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchTickets() {
    try {
      const data = await getMyTickets()
      setTickets(data)
      setError(null)
    } catch (err) {
      console.error('Error fetching tickets:', err)
      setError('Failed to fetch tickets')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnassign = async (ticketId: string) => {
    try {
      setIsUnassigning(ticketId)
      await unassignTicket(ticketId)
      await fetchTickets()
    } catch (err) {
      console.error('Error unassigning ticket:', err)
      setError('Failed to unassign ticket')
    } finally {
      setIsUnassigning(null)
    }
  }

  const handleClose = async (ticketId: string) => {
    try {
      setIsClosing(ticketId)
      await closeTicket(ticketId)
      await fetchTickets()
    } catch (err) {
      console.error('Error closing ticket:', err)
      setError('Failed to close ticket')
    } finally {
      setIsClosing(null)
    }
  }

  if (isLoading) {
    return (
      <div className="h-full overflow-auto">
        <div className="max-w-3xl mx-auto p-6">
          <div className="flex justify-center p-4">Loading...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full overflow-auto">
        <div className="max-w-3xl mx-auto p-6">
          <div className="text-red-500">{error}</div>
        </div>
      </div>
    )
  }

  // Filter out statuses that shouldn't appear in my tickets
  const myTicketStatuses = TICKET_STATUSES.filter(status => 
    ['in_progress', 'closed', 'cancelled'].includes(status.value)
  )

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-3xl mx-auto p-6">
        <TicketList
          tickets={tickets}
          defaultFilters={{
            statuses: ['in_progress'],
            priorities: TICKET_PRIORITIES.map(p => p.value)
          }}
          availableStatuses={myTicketStatuses}
          renderHeader={<h1 className="text-2xl font-semibold">My Tickets</h1>}
          renderActions={ticket => (
            <div className="flex gap-2">
              {ticket.status !== 'closed' && (
                <ActionButton.close
                  onClick={(e) => {
                    e.stopPropagation()
                    handleClose(ticket.id)
                  }}
                  loading={isClosing === ticket.id}
                >
                  {isClosing === ticket.id ? 'Closing...' : 'Close'}
                </ActionButton.close>
              )}
              {ticket.status !== 'closed' && (
                <ActionButton.unclaim
                  onClick={(e) => {
                    e.stopPropagation()
                    handleUnassign(ticket.id)
                  }}
                  loading={isUnassigning === ticket.id}
                >
                  {isUnassigning === ticket.id ? 'Unassigning...' : 'Unassign'}
                </ActionButton.unclaim>
              )}
            </div>
          )}
          getAttachmentUrl={getAttachmentUrl}
        />
      </div>
    </div>
  )
} 