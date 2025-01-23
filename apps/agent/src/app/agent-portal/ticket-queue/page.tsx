'use client'

import { useEffect, useState } from 'react'
import { createClient } from 'shared/src/lib/supabase'
import { Ticket, getUnassignedTickets, assignTicket } from 'shared/src/services/tickets'
import { Button } from 'shared/src/components/ui'
import { Dialog } from 'shared/src/components/ui/Dialog'
import { TicketTemplate, ActionButton } from 'shared/src/components/tickets/TicketTemplate'

export default function TicketQueuePage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({})
  const [isAssigning, setIsAssigning] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    // Initial fetch of unassigned tickets
    async function fetchUnassignedTickets() {
      try {
        const data = await getUnassignedTickets()
        setTickets(data)
        setError(null)
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
      setIsAssigning(ticketId)
      await assignTicket(ticketId)
      setSelectedTicket(null)
      setError(null)
    } catch (err) {
      console.error('Error assigning ticket:', err)
      setError('Failed to assign ticket')
    } finally {
      setIsAssigning(null)
    }
  }

  const getAttachmentUrl = async (path: string) => {
    if (attachmentUrls[path]) return attachmentUrls[path]
    
    const supabase = createClient()
    const { data } = await supabase.storage.from('attachments').getPublicUrl(path)
    const url = data.publicUrl
    setAttachmentUrls(prev => ({ ...prev, [path]: url }))
    return url
  }

  if (loading) {
    return (
      <div className="h-full overflow-auto">
        <div className="max-w-3xl mx-auto p-6">
          <h1 className="text-2xl font-semibold mb-6">Ticket Queue</h1>
          <div className="flex justify-center p-4">Loading...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full overflow-auto">
        <div className="max-w-3xl mx-auto p-6">
          <h1 className="text-2xl font-semibold mb-6">Ticket Queue</h1>
          <div className="text-red-500">{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-6">Ticket Queue</h1>
        
        {!tickets.length ? (
          <div className="text-gray-500">No unassigned tickets</div>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <TicketTemplate
                key={ticket.id}
                ticket={ticket}
                onTicketClick={() => setSelectedTicket(ticket)}
                getAttachmentUrl={getAttachmentUrl}
                readOnlyComments={true}
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
              />
            ))}
          </div>
        )}

        <Dialog
          isOpen={selectedTicket !== null}
          onClose={() => setSelectedTicket(null)}
          title={selectedTicket ? `Ticket #${selectedTicket.number}` : ''}
        >
          {selectedTicket && (
            <TicketTemplate
              ticket={selectedTicket}
              getAttachmentUrl={getAttachmentUrl}
              isDetailView={true}
              readOnlyComments={true}
              renderActions={ticket => (
                <ActionButton.claim
                  onClick={() => handleAssign(ticket.id)}
                  loading={isAssigning === ticket.id}
                >
                  {isAssigning === ticket.id ? 'Claiming...' : 'Claim'}
                </ActionButton.claim>
              )}
            />
          )}
        </Dialog>
      </div>
    </div>
  )
} 