'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'
import { Ticket, assignTicket, getAttachmentUrl } from '../../services/tickets'
import { getPriorityDetails, getStatusDetails } from '../../config/tickets'
import { Button } from '../ui'
import { Dialog } from '../ui/Dialog'
import { TicketDetails } from './TicketDetails'

export function TicketQueue() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({})

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
      setSelectedTicket(null) // Close modal if open
    } catch (err) {
      console.error('Error assigning ticket:', err)
      setError('Failed to assign ticket')
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
    return <div className="text-gray-500">No unassigned tickets</div>
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
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-medium">
                  {ticket.subject}
                </h3>
                <div className="mt-1 text-sm text-gray-500">
                  From: {ticket.client?.full_name || ticket.client?.email || 'Unknown'}
                </div>
                <p className="mt-2 text-sm text-gray-700">{ticket.description}</p>
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
              </div>
              <div className="flex flex-col gap-2 ml-4">
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
            <div className="flex justify-end mt-4">
              <span className="text-xs text-gray-400 mr-4 self-center">
                ID {ticket.number}
              </span>
              <Button
                onClick={(e) => {
                  e.stopPropagation() // Prevent opening modal when clicking assign
                  handleAssign(ticket.id)
                }}
              >
                Claim
              </Button>
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
            onAssign={handleAssign}
            getAttachmentUrl={handleGetAttachmentUrl}
          />
        )}
      </Dialog>
    </div>
  )
} 