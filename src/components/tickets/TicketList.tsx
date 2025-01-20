'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Ticket, getTickets, cancelTicket, getAttachmentUrl } from '@/services/tickets'
import { TICKET_PRIORITIES, TICKET_STATUSES } from '@/config/tickets'
import { Dialog } from '@/components/ui/Dialog'
import { TicketDetails } from './TicketDetails'

export function TicketList() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCancelling, setIsCancelling] = useState<string | null>(null)
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({})
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)

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
          event: 'INSERT',
          schema: 'public',
          table: 'tickets'
        },
        (payload) => {
          console.log('INSERT event received:', payload)
          fetchTickets()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tickets'
        },
        (payload) => {
          console.log('UPDATE event received:', payload)
          fetchTickets()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'tickets'
        },
        (payload) => {
          console.log('DELETE event received:', payload)
          fetchTickets()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attachments'
        },
        (payload) => {
          console.log('Attachment change detected:', payload)
          fetchTickets()
        }
      )

    console.log('Setting up subscription...')
    channel.subscribe((status) => {
      console.log('Subscription status:', status)
      if (status === 'SUBSCRIBED') {
        console.log('Successfully subscribed to tickets changes')
      }
    })

    return () => {
      console.log('Cleaning up subscription')
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

  async function handleCancelTicket(ticketId: string) {
    try {
      console.log('Starting ticket cancellation for:', ticketId)
      setIsCancelling(ticketId)
      setError(null)
      
      const updatedTicket = await cancelTicket(ticketId)
      console.log('Ticket cancelled successfully:', updatedTicket)
      
      // Manually update the tickets list in case realtime fails
      setTickets(tickets => tickets.map(ticket => 
        ticket.id === ticketId 
          ? { ...ticket, status: 'cancelled' }
          : ticket
      ))
    } catch (err) {
      console.error('Error cancelling ticket:', err)
      setError('Failed to cancel ticket. Please try again.')
      // Refresh the list to ensure we're in sync
      fetchTickets()
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
          onClick={() => setSelectedTicket(ticket)}
          className="bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
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
                  TICKET_STATUSES.find((s) => s.value === ticket.status)?.color
                } px-2.5 py-0.5 rounded-full text-sm font-medium`}
              >
                {ticket.status.replace('_', ' ')}
              </span>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
            <div className="flex flex-col gap-2">
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
              {ticket.attachments && ticket.attachments.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-700">Attachments:</span>
                  <div className="flex flex-wrap gap-2">
                    {ticket.attachments.map((attachment) => (
                      <a
                        key={attachment.id}
                        href={attachmentUrls[attachment.storage_path] || '#'}
                        onClick={async (e) => {
                          e.preventDefault()
                          e.stopPropagation() // Prevent opening modal when clicking attachment
                          window.open(
                            await handleGetAttachmentUrl(attachment.storage_path),
                            '_blank'
                          )
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 text-sm text-blue-600 hover:text-blue-700 hover:underline bg-blue-50 rounded"
                      >
                        {attachment.file_name}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span>
                {new Date(ticket.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
              {ticket.status !== 'cancelled' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation() // Prevent opening modal when clicking cancel
                    handleCancelTicket(ticket.id)
                  }}
                  disabled={isCancelling === ticket.id}
                  className="px-2 py-1 text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCancelling === ticket.id ? 'Cancelling...' : 'Cancel'}
                </button>
              )}
            </div>
          </div>
        </div>
      ))}

      <Dialog
        isOpen={selectedTicket !== null}
        onClose={() => setSelectedTicket(null)}
        title="Ticket Details"
      >
        {selectedTicket && (
          <TicketDetails
            ticket={selectedTicket}
            onClose={() => setSelectedTicket(null)}
          />
        )}
      </Dialog>
    </div>
  )
} 