'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'
import { Ticket, getMyTickets, closeTicket, getAttachmentUrl, unassignTicket } from '../../services/tickets'
import { getPriorityDetails, getStatusDetails } from '../../config/tickets'
import { Button } from '../ui'
import { Dialog } from '../ui/Dialog'
import { TicketDetails } from './TicketDetails'

export function MyTickets() {
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
    try {
      setIsClosing(ticketId)
      await closeTicket(ticketId)
      // Ticket will be updated automatically via subscription
      setSelectedTicket(null) // Close modal if open
    } catch (err) {
      console.error('Error closing ticket:', err)
      setError('Failed to close ticket')
    } finally {
      setIsClosing(null)
    }
  }

  const handleUnassign = async (ticketId: string) => {
    try {
      setIsUnassigning(ticketId)
      await unassignTicket(ticketId)
      // Ticket will be updated automatically via subscription
      setSelectedTicket(null) // Close modal if open
    } catch (err) {
      console.error('Error unassigning ticket:', err)
      setError('Failed to unassign ticket')
    } finally {
      setIsUnassigning(null)
    }
  }

  // Get attachment URL and cache it
  async function handleGetAttachmentUrl(path: string) {
    if (attachmentUrls[path]) return attachmentUrls[path]
    
    const url = await getAttachmentUrl(path)
    setAttachmentUrls(prev => ({ ...prev, [path]: url }))
    return url
  }

  if (loading) {
    return <div className="flex justify-center p-4">Loading...</div>
  }

  if (error) {
    return <div className="text-red-500">{error}</div>
  }

  if (!tickets.length) {
    return <div className="text-gray-500">No tickets assigned to you</div>
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      {tickets.map((ticket) => {
        const priorityDetails = getPriorityDetails(ticket.priority)
        const statusDetails = getStatusDetails(ticket.status)
        
        return (
          <div 
            key={ticket.id} 
            className="bg-white shadow rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setSelectedTicket(ticket)}
          >
            <div className="flex flex-col">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium">
                    {ticket.subject}
                  </h3>
                  <div className="mt-1 text-sm text-gray-500">
                    From: {ticket.client?.full_name || ticket.client?.email || 'Unknown'}
                  </div>
                  <p className="mt-2 text-sm text-gray-700">{ticket.description}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusDetails?.color || 'bg-gray-100 text-gray-800'}`}
                  >
                    {statusDetails?.label || ticket.status}
                  </span>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityDetails?.color || 'bg-gray-100 text-gray-800'}`}
                  >
                    {priorityDetails?.label || ticket.priority}
                  </span>
                </div>
              </div>
              {ticket.attachments && ticket.attachments.length > 0 && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-gray-700 text-sm">Attachments:</span>
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
              {ticket.status !== 'closed' && (
                <div className="flex justify-end gap-2 mt-4">
                  <span className="text-xs text-gray-400 self-center">
                    ID {ticket.number}
                  </span>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation() // Prevent opening modal when clicking unassign
                      handleUnassign(ticket.id)
                    }}
                    variant="secondary"
                    loading={isUnassigning === ticket.id}
                  >
                    Unclaim
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation() // Prevent opening modal when clicking close
                      handleClose(ticket.id)
                    }}
                    variant="secondary"
                    loading={isClosing === ticket.id}
                  >
                    Close
                  </Button>
                </div>
              )}
            </div>
          </div>
        )
      })}

      <Dialog
        isOpen={selectedTicket !== null}
        onClose={() => setSelectedTicket(null)}
        title={selectedTicket ? `Ticket #${selectedTicket.number}` : ''}
      >
        {selectedTicket && (
          <TicketDetails
            ticket={selectedTicket}
            onClose={() => setSelectedTicket(null)}
            onCancel={handleClose}
            isCancelling={isClosing === selectedTicket.id}
            getAttachmentUrl={handleGetAttachmentUrl}
          />
        )}
      </Dialog>
    </div>
  )
} 