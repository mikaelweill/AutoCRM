'use client'

import { useState, useEffect } from 'react'
import { useAuth } from "shared/src/contexts/AuthContext"
import { CreateTicketForm } from 'shared/src/components/tickets/CreateTicketForm'
import { ActionButton } from 'shared/src/components/tickets/TicketTemplate'
import { TicketList } from 'shared/src/components/tickets/TicketList'
import { Ticket, getTickets, cancelTicket, getAttachmentUrl } from 'shared/src/services/tickets'

export default function MyNewTicketsPage() {
  const { user } = useAuth()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCancelling, setIsCancelling] = useState<string | null>(null)

  useEffect(() => {
    fetchTickets()
  }, [])

  async function fetchTickets() {
    try {
      const data = await getTickets()
      setTickets(data)
      setError(null)
    } catch (err) {
      console.error('Error fetching tickets:', err)
      setError('Failed to fetch tickets')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateTicket = async () => {
    await fetchTickets()
  }

  const handleCancelTicket = async (ticketId: string) => {
    try {
      setIsCancelling(ticketId)
      await cancelTicket(ticketId)
      await fetchTickets()
    } catch (err) {
      console.error('Error cancelling ticket:', err)
      setError('Failed to cancel ticket')
    } finally {
      setIsCancelling(null)
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

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-3xl mx-auto p-6">
        <TicketList
          tickets={tickets}
          renderHeader={<h1 className="text-2xl font-semibold">My Tickets (New)</h1>}
          renderActions={ticket => (
            <ActionButton.cancel
              onClick={() => handleCancelTicket(ticket.id)}
              loading={isCancelling === ticket.id}
            >
              {isCancelling === ticket.id ? 'Cancelling...' : 'Cancel'}
            </ActionButton.cancel>
          )}
          renderCreateForm={
            <CreateTicketForm
              onSuccess={handleCreateTicket}
              onCancel={() => {}} // This will be handled by Dialog
            />
          }
          getAttachmentUrl={getAttachmentUrl}
        />
      </div>
    </div>
  )
} 