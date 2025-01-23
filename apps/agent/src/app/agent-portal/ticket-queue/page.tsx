'use client'

import { useState, useEffect } from 'react'
import { Ticket, getUnassignedTickets, assignTicket, getAttachmentUrl } from 'shared/src/services/tickets'
import { ActionButton } from 'shared/src/components/tickets/TicketTemplate'
import { TicketList } from 'shared/src/components/tickets/TicketList'
import { TICKET_PRIORITIES, TICKET_STATUSES } from 'shared/src/config/tickets'

export default function TicketQueuePage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAssigning, setIsAssigning] = useState<string | null>(null)

  useEffect(() => {
    fetchTickets()
  }, [])

  async function fetchTickets() {
    try {
      const data = await getUnassignedTickets()
      setTickets(data)
      setError(null)
    } catch (err) {
      console.error('Error fetching tickets:', err)
      setError('Failed to fetch tickets')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAssign = async (ticketId: string) => {
    try {
      setIsAssigning(ticketId)
      await assignTicket(ticketId)
      await fetchTickets()
    } catch (err) {
      console.error('Error assigning ticket:', err)
      setError('Failed to assign ticket')
    } finally {
      setIsAssigning(null)
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

  // Filter out statuses that shouldn't appear in the queue
  const queueStatuses = TICKET_STATUSES.filter(status => 
    ['new', 'cancelled'].includes(status.value)
  )

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-3xl mx-auto p-6">
        <TicketList
          tickets={tickets}
          defaultFilters={{
            statuses: ['new'],
            priorities: TICKET_PRIORITIES.map(p => p.value)
          }}
          availableStatuses={queueStatuses}
          renderHeader={<h1 className="text-2xl font-semibold">Ticket Queue</h1>}
          renderActions={ticket => (
            <ActionButton.claim
              onClick={(e) => {
                e.stopPropagation()
                handleAssign(ticket.id)
              }}
              loading={isAssigning === ticket.id}
            >
              {isAssigning === ticket.id ? 'Claiming...' : 'Claim'}
            </ActionButton.claim>
          )}
          getAttachmentUrl={getAttachmentUrl}
          readOnlyComments={true}
        />
      </div>
    </div>
  )
} 