'use client'

import { useState } from 'react'
import { useAuth } from "shared/src/contexts/AuthContext"
import { CreateTicketForm } from 'shared/src/components/tickets/CreateTicketForm'
import { TicketTemplate } from 'shared/src/components/tickets/TicketTemplate'
import { Dialog } from 'shared/src/components/ui/Dialog'
import { Button } from 'shared/src/components/ui/Button'
import { Ticket, getTickets, cancelTicket, getAttachmentUrl } from 'shared/src/services/tickets'
import { useEffect } from 'react'
import { createClient } from 'shared/src/lib/supabase'

export default function MyTicketsPage() {
  const { user } = useAuth()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCancelling, setIsCancelling] = useState<string | null>(null)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({})

  useEffect(() => {
    const supabase = createClient()
    
    // Initial fetch
    fetchTickets()

    // Set up real-time subscription
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
          fetchTickets()
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

  const handleCreateTicket = async (ticketId: string) => {
    setIsCreateModalOpen(false)
    fetchTickets()
  }

  const handleCancelTicket = async (ticketId: string) => {
    try {
      setIsCancelling(ticketId)
      await cancelTicket(ticketId)
      setSelectedTicket(null) // Close modal if open
    } catch (err) {
      console.error('Error cancelling ticket:', err)
      setError('Failed to cancel ticket')
    } finally {
      setIsCancelling(null)
    }
  }

  // Get attachment URL and cache it
  async function handleGetAttachmentUrl(path: string) {
    if (attachmentUrls[path]) return attachmentUrls[path]
    
    const url = await getAttachmentUrl(path)
    setAttachmentUrls(prev => ({ ...prev, [path]: url }))
    return url
  }

  if (isLoading) {
    return (
      <div className="h-full overflow-auto">
        <div className="max-w-xl mx-auto p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-semibold text-gray-900">My Tickets</h1>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              Create Ticket
            </Button>
          </div>
          <div className="text-center py-8">Loading tickets...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full overflow-auto">
        <div className="max-w-xl mx-auto p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-semibold text-gray-900">My Tickets</h1>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              Create Ticket
            </Button>
          </div>
          <div className="text-center py-8 text-red-600">{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-xl mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">My Tickets</h1>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            Create Ticket
          </Button>
        </div>

        {!tickets.length ? (
          <div className="text-center py-8 text-gray-500">
            No tickets found. Create your first ticket to get started.
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <TicketTemplate
                key={ticket.id}
                ticket={ticket}
                onTicketClick={setSelectedTicket}
                getAttachmentUrl={handleGetAttachmentUrl}
                renderActions={ticket => ticket.status !== 'cancelled' && (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCancelTicket(ticket.id)
                    }}
                    className="bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200"
                    disabled={isCancelling === ticket.id}
                  >
                    {isCancelling === ticket.id ? 'Cancelling...' : 'Cancel'}
                  </Button>
                )}
              />
            ))}
          </div>
        )}

        <Dialog
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Create New Ticket"
        >
          <CreateTicketForm
            onSuccess={handleCreateTicket}
            onCancel={() => setIsCreateModalOpen(false)}
          />
        </Dialog>

        <Dialog
          isOpen={selectedTicket !== null}
          onClose={() => setSelectedTicket(null)}
          title={selectedTicket ? `Ticket #${selectedTicket.number}` : ''}
        >
          {selectedTicket && (
            <TicketTemplate
              ticket={selectedTicket}
              getAttachmentUrl={handleGetAttachmentUrl}
              isDetailView={true}
              renderActions={ticket => ticket.status !== 'cancelled' && (
                <Button
                  onClick={() => handleCancelTicket(ticket.id)}
                  className="bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200"
                  disabled={isCancelling === ticket.id}
                >
                  {isCancelling === ticket.id ? 'Cancelling...' : 'Cancel'}
                </Button>
              )}
            />
          )}
        </Dialog>
      </div>
    </div>
  )
} 