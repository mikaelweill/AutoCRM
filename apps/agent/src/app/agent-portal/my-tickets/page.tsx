'use client'

import { useEffect, useState } from 'react'
import { createClient } from 'shared/src/lib/supabase'
import { Ticket, getMyTickets } from 'shared/src/services/tickets'
import { Button } from 'shared/src/components/ui'
import { Dialog } from 'shared/src/components/ui/Dialog'
import { TicketTemplate, ActionButton } from 'shared/src/components/tickets/TicketTemplate'

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({})
  const [isClosing, setIsClosing] = useState<string | null>(null)
  const [isUnassigning, setIsUnassigning] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    // Initial fetch of my tickets
    async function fetchMyTickets() {
      try {
        const data = await getMyTickets()
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
      .channel('my-tickets')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets'
        },
        () => {
          fetchMyTickets()
        }
      )
      .subscribe()

    fetchMyTickets()

    return () => {
      channel.unsubscribe()
    }
  }, [])

  const handleClose = async (ticketId: string) => {
    const supabase = createClient()
    try {
      setIsClosing(ticketId)
      const { error } = await supabase
        .from('tickets')
        .update({ 
          status: 'closed',
          resolved_at: new Date().toISOString()
        })
        .eq('id', ticketId)
      
      if (error) throw error
      setSelectedTicket(null)
    } catch (err) {
      console.error('Error closing ticket:', err)
      setError('Failed to close ticket')
    } finally {
      setIsClosing(null)
    }
  }

  const handleUnassign = async (ticketId: string) => {
    const supabase = createClient()
    try {
      setIsUnassigning(ticketId)
      const { error } = await supabase
        .from('tickets')
        .update({ 
          agent_id: null,
          status: 'new'
        })
        .eq('id', ticketId)
      
      if (error) throw error
      setSelectedTicket(null)
    } catch (err) {
      console.error('Error unassigning ticket:', err)
      setError('Failed to unassign ticket')
    } finally {
      setIsUnassigning(null)
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
          <h1 className="text-2xl font-semibold mb-6">My Tickets</h1>
          <div className="flex justify-center p-4">Loading...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full overflow-auto">
        <div className="max-w-3xl mx-auto p-6">
          <h1 className="text-2xl font-semibold mb-6">My Tickets</h1>
          <div className="text-red-500">{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-6">My Tickets</h1>
        
        {!tickets.length ? (
          <div className="text-gray-500">No tickets assigned to you</div>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <TicketTemplate
                key={ticket.id}
                ticket={ticket}
                onTicketClick={() => setSelectedTicket(ticket)}
                getAttachmentUrl={getAttachmentUrl}
                renderActions={ticket => ticket.status !== 'closed' && (
                  <div className="flex gap-2">
                    <ActionButton.unclaim
                      onClick={(e) => {
                        e.stopPropagation()
                        handleUnassign(ticket.id)
                      }}
                      loading={isUnassigning === ticket.id}
                    >
                      Unclaim
                    </ActionButton.unclaim>
                    <ActionButton.close
                      onClick={(e) => {
                        e.stopPropagation()
                        handleClose(ticket.id)
                      }}
                      loading={isClosing === ticket.id}
                    >
                      Close
                    </ActionButton.close>
                  </div>
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
              renderActions={ticket => ticket.status !== 'closed' && (
                <div className="flex gap-2">
                  <ActionButton.unclaim
                    onClick={() => handleUnassign(ticket.id)}
                    loading={isUnassigning === ticket.id}
                  >
                    Unclaim
                  </ActionButton.unclaim>
                  <ActionButton.close
                    onClick={() => handleClose(ticket.id)}
                    loading={isClosing === ticket.id}
                  >
                    Close
                  </ActionButton.close>
                </div>
              )}
            />
          )}
        </Dialog>
      </div>
    </div>
  )
} 