'use client'

import { useEffect, useState } from 'react'
import { createClient } from 'shared/src/lib/supabase'
import { Database } from 'shared/src/types/database'
import { Button } from 'shared/src/components/ui'
import { Dialog } from 'shared/src/components/ui/Dialog'
import { TicketTemplate } from 'shared/src/components/tickets/TicketTemplate'

type Ticket = Database['public']['Tables']['tickets']['Row'] & {
  client: Database['public']['Tables']['users']['Row']
  agent: Database['public']['Tables']['users']['Row'] | null
  attachments: Array<Database['public']['Tables']['attachments']['Row']>
  metadata: Record<string, any>
}

export default function TicketQueuePage() {
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
        setTickets(data as any)
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
    const supabase = createClient()
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ 
          agent_id: (await supabase.auth.getUser()).data.user?.id,
          status: 'in_progress'
        })
        .eq('id', ticketId)
      
      if (error) throw error
      setSelectedTicket(null)
    } catch (err) {
      console.error('Error assigning ticket:', err)
      setError('Failed to assign ticket')
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
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAssign(ticket.id)
                    }}
                    className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200"
                  >
                    Claim
                  </Button>
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
                <Button
                  onClick={() => handleAssign(ticket.id)}
                  className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200"
                >
                  Claim
                </Button>
              )}
            />
          )}
        </Dialog>
      </div>
    </div>
  )
} 