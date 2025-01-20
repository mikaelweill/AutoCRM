import { createClient } from '@/lib/supabase'
import { TicketPriority } from '@/config/tickets'

export interface CreateTicketData {
  subject: string
  description: string
  priority: TicketPriority
  attachments?: File[]
}

export async function createTicket(data: CreateTicketData) {
  console.log('Creating ticket with data:', data)
  
  const supabase = createClient()
  
  // First get the session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) {
    console.error('Session error:', sessionError)
    throw new Error('Failed to get auth session')
  }
  
  if (!session) {
    console.error('No active session')
    throw new Error('User must be logged in to create a ticket')
  }
  
  // Then get the user from the session
  const user = session.user
  console.log('Auth user:', user)

  try {
    // Insert ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .insert({
        subject: data.subject,
        description: data.description,
        priority: data.priority,
        client_id: user.id,
        status: 'new'
      })
      .select()
      .single()

    if (ticketError) {
      console.error('Ticket creation error:', ticketError)
      throw ticketError
    }
    if (!ticket) throw new Error('Failed to create ticket')

    // Handle attachments if any
    if (data.attachments?.length) {
      for (const file of data.attachments) {
        const path = `tickets/${ticket.id}/${file.name}`
        
        // Upload file
        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(path, file)

        if (uploadError) {
          console.error('Failed to upload attachment:', uploadError)
          continue
        }

        // Create attachment record
        const { error: attachmentError } = await supabase
          .from('attachments')
          .insert({
            ticket_id: ticket.id,
            user_id: user.id,
            name: file.name,
            path: path,
            size: file.size,
            type: file.type,
          })

        if (attachmentError) {
          console.error('Failed to create attachment record:', attachmentError)
        }
      }
    }

    return ticket.id
  } catch (error) {
    console.error('Error creating ticket:', error)
    throw new Error('Failed to create ticket')
  }
} 