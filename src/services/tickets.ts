import { createClient } from '@/lib/supabase'
import { TicketPriority } from '@/config/tickets'

export interface CreateTicketData {
  subject: string
  description: string
  priority: TicketPriority
  attachments?: File[]
}

interface User {
  email: string
  full_name: string | null
}

export interface Ticket {
  id: string
  number: number
  subject: string
  description: string
  status: 'new' | 'in_progress' | 'resolved' | 'closed'
  priority: TicketPriority
  client_id: string
  agent_id: string | null
  created_at: string
  updated_at: string
  resolved_at: string | null
  client: User
  agent: User | null
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
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            storage_path: path,
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

export async function getTickets() {
  const supabase = createClient()
  
  const { data: tickets, error } = await supabase
    .from('tickets')
    .select(`
      *,
      client:client_id(email, full_name),
      agent:agent_id(email, full_name)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching tickets:', error)
    throw new Error('Failed to fetch tickets')
  }

  return tickets
} 