import { createClient } from '@/lib/supabase'
import { TicketPriority, TicketStatus } from '@/config/tickets'

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

interface Attachment {
  id: string
  ticket_id: string
  file_name: string
  file_type: string
  file_size: number
  storage_path: string
  created_at: string
}

export interface Ticket {
  id: string
  number: number
  subject: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  client_id: string
  agent_id: string | null
  created_at: string
  updated_at: string
  resolved_at: string | null
  client: User
  agent: User | null
  attachments?: Attachment[]
}

export async function createTicket(data: CreateTicketData) {
  console.log('Creating ticket with data:', data)
  
  const supabase = createClient()
  
  // First get the session
  const { data: { user }, error: sessionError } = await supabase.auth.getUser()
  if (sessionError) {
    console.error('Session error:', sessionError)
    throw new Error('Failed to get auth session')
  }
  
  if (!user) {
    console.error('No active session')
    throw new Error('User must be logged in to create a ticket')
  }
  
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
      agent:agent_id(email, full_name),
      attachments(
        id,
        file_name,
        file_type,
        file_size,
        storage_path,
        created_at
      )
    `)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching tickets:', error)
    throw new Error('Failed to fetch tickets')
  }

  console.log('Fetched tickets with attachments:', tickets)
  return tickets
}

export async function cancelTicket(ticketId: string) {
  console.log('Attempting to cancel ticket:', ticketId)
  const supabase = createClient()
  
  // Get the current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    console.error('Error getting user:', userError)
    throw new Error('User must be logged in to cancel ticket')
  }

  // First verify the ticket exists and belongs to the user
  const { data: existingTicket, error: fetchError } = await supabase
    .from('tickets')
    .select()
    .eq('id', ticketId)
    .eq('client_id', user.id)
    .single()

  if (fetchError || !existingTicket) {
    console.error('Error fetching ticket:', fetchError)
    throw new Error('Ticket not found or access denied')
  }

  console.log('Found existing ticket:', existingTicket)

  // Perform the update with explicit conditions
  const { data: updateResult, error: updateError } = await supabase
    .from('tickets')
    .update({ 
      status: 'cancelled',
      updated_at: new Date().toISOString()
    })
    .eq('id', ticketId)
    .eq('client_id', user.id) // Ensure user owns the ticket
    .select()

  if (updateError) {
    console.error('Error updating ticket:', updateError)
    throw updateError
  }

  console.log('Update result:', updateResult)

  // Fetch the updated ticket
  const { data: updatedTicket, error: refetchError } = await supabase
    .from('tickets')
    .select(`
      *,
      client:client_id(email, full_name),
      agent:agent_id(email, full_name)
    `)
    .eq('id', ticketId)
    .single()

  if (refetchError || !updatedTicket) {
    console.error('Error fetching updated ticket:', refetchError)
    throw new Error('Failed to fetch updated ticket')
  }

  console.log('Successfully cancelled ticket:', updatedTicket)
  return updatedTicket
}

export async function getAttachmentUrl(path: string) {
  const supabase = createClient()
  const { data } = await supabase.storage.from('attachments').getPublicUrl(path)
  return data.publicUrl
} 