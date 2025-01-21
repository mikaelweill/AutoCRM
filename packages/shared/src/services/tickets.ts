import { createClient } from '../lib/supabase'
import { TicketPriority, TicketStatus } from '../config/tickets'
import { Database } from '../types/database'

// Type aliases for better readability
type Tables = Database['public']['Tables']
type TicketRow = Tables['tickets']['Row']
type TicketActivityRow = Tables['ticket_activities']['Row']
type UserRow = Tables['users']['Row']
type AttachmentRow = Tables['attachments']['Row']

export interface CreateTicketData {
  subject: string
  description: string
  priority: TicketPriority
  attachments?: File[]
}

export interface User {
  id: string
  email: string
  full_name: string | null
  role: 'client' | 'agent' | 'admin'
  created_at: string
  updated_at: string
  last_seen: string | null
  metadata: Record<string, any>
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

export interface TicketActivity {
  id: string
  ticket_id: string
  user_id: string
  activity_type: 'comment' | 'status_change' | 'priority_change' | 'agent_assignment' | 'attachment_added'
  content: string
  is_internal: boolean
  created_at: string
  user: Pick<User, 'id' | 'email' | 'full_name'>
}

// Type guards
function isUser(data: unknown): data is User {
  const user = data as User
  return (
    typeof user === 'object' &&
    user !== null &&
    typeof user.id === 'string' &&
    typeof user.email === 'string' &&
    (user.full_name === null || typeof user.full_name === 'string') &&
    typeof user.role === 'string'
    // Note: Not checking optional fields like created_at, updated_at, last_seen, metadata
  )
}

function isAttachment(data: unknown): data is Attachment {
  const attachment = data as Attachment
  return (
    typeof attachment === 'object' &&
    attachment !== null &&
    typeof attachment.id === 'string' &&
    typeof attachment.ticket_id === 'string' &&
    typeof attachment.file_name === 'string' &&
    typeof attachment.file_type === 'string' &&
    typeof attachment.file_size === 'number' &&
    typeof attachment.storage_path === 'string' &&
    typeof attachment.created_at === 'string'
  )
}

function isTicket(data: unknown): data is Ticket {
  const ticket = data as Ticket
  return (
    typeof ticket === 'object' &&
    ticket !== null &&
    typeof ticket.id === 'string' &&
    typeof ticket.number === 'number' &&
    typeof ticket.subject === 'string' &&
    typeof ticket.description === 'string' &&
    typeof ticket.status === 'string' &&
    typeof ticket.priority === 'string' &&
    typeof ticket.client_id === 'string' &&
    typeof ticket.created_at === 'string' &&
    typeof ticket.updated_at === 'string' &&
    // Check nullable fields
    (ticket.agent_id === null || typeof ticket.agent_id === 'string') &&
    (ticket.resolved_at === null || typeof ticket.resolved_at === 'string') &&
    // Check nested objects
    (typeof ticket.client === 'object' && ticket.client !== null &&
      typeof ticket.client.id === 'string' &&
      typeof ticket.client.email === 'string' &&
      typeof ticket.client.role === 'string') &&
    // Agent can be null
    (ticket.agent === null || (
      typeof ticket.agent === 'object' && ticket.agent !== null &&
      typeof ticket.agent.id === 'string' &&
      typeof ticket.agent.email === 'string' &&
      typeof ticket.agent.role === 'string'
    )) &&
    // Attachments are optional and can be an empty array
    (!ticket.attachments || Array.isArray(ticket.attachments))
  )
}

function isTicketActivity(data: unknown): data is TicketActivity {
  const activity = data as TicketActivity
  return (
    typeof activity === 'object' &&
    activity !== null &&
    typeof activity.id === 'string' &&
    typeof activity.ticket_id === 'string' &&
    typeof activity.user_id === 'string' &&
    typeof activity.activity_type === 'string' &&
    typeof activity.created_at === 'string'
  )
}

export async function createTicket(data: CreateTicketData): Promise<string> {
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
      .select('id')
      .single()

    if (ticketError) {
      console.error('Ticket creation error:', ticketError)
      throw ticketError
    }
    if (!ticket || typeof ticket.id !== 'string') {
      throw new Error('Failed to create ticket')
    }

    const ticketId = ticket.id

    // Handle attachments if any
    if (data.attachments?.length) {
      for (const file of data.attachments) {
        const path = `tickets/${ticketId}/${file.name}`
        
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
            ticket_id: ticketId,
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

    return ticketId
  } catch (error) {
    console.error('Error creating ticket:', error)
    throw new Error('Failed to create ticket')
  }
}

export async function getTickets(): Promise<Ticket[]> {
  const supabase = createClient()
  
  const { data: rawTickets, error } = await supabase
    .from('tickets')
    .select(`
      *,
      client:client_id(id, email, full_name, role),
      agent:agent_id(id, email, full_name, role),
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

  // Cast through unknown first
  const tickets = rawTickets as unknown
  
  // Now cast to an array and filter with type guard
  const validTickets = (tickets as any[]).filter(ticket => {
    const isValid = isTicket(ticket)
    if (!isValid) {
      console.warn('Invalid ticket data:', ticket)
    }
    return isValid
  })

  return validTickets
}

export async function cancelTicket(ticketId: string): Promise<Ticket> {
  console.log('Attempting to cancel ticket:', ticketId)
  const supabase = createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    console.error('Error getting user:', userError)
    throw new Error('User must be logged in to cancel ticket')
  }

  // First verify the ticket exists and belongs to the user
  const { data: existingTicket, error: fetchError } = await supabase
    .from('tickets')
    .select(`
      *,
      client:client_id(id, email, full_name, role),
      agent:agent_id(id, email, full_name, role),
      attachments(
        id,
        file_name,
        file_type,
        file_size,
        storage_path,
        created_at
      )
    `)
    .eq('id', ticketId)
    .eq('client_id', user.id)
    .single()

  if (fetchError || !existingTicket) {
    console.error('Error fetching ticket:', fetchError)
    throw new Error('Ticket not found or access denied')
  }

  if (!isTicket(existingTicket)) {
    console.error('Invalid ticket data:', existingTicket)
    throw new Error('Invalid ticket data received')
  }

  console.log('Found existing ticket:', existingTicket)

  // Perform the update with explicit conditions
  const { error: updateError } = await supabase
    .from('tickets')
    .update({ 
      status: 'cancelled',
      updated_at: new Date().toISOString()
    })
    .eq('id', ticketId)
    .eq('client_id', user.id)

  if (updateError) {
    console.error('Error updating ticket:', updateError)
    throw updateError
  }

  // Fetch the updated ticket
  const { data: updatedTicket, error: refetchError } = await supabase
    .from('tickets')
    .select(`
      *,
      client:client_id(id, email, full_name, role),
      agent:agent_id(id, email, full_name, role),
      attachments(
        id,
        file_name,
        file_type,
        file_size,
        storage_path,
        created_at
      )
    `)
    .eq('id', ticketId)
    .single()

  if (refetchError || !updatedTicket) {
    console.error('Error fetching updated ticket:', refetchError)
    throw new Error('Failed to fetch updated ticket')
  }

  if (!isTicket(updatedTicket)) {
    throw new Error('Invalid updated ticket data received')
  }

  console.log('Successfully cancelled ticket:', updatedTicket)
  return updatedTicket
}

export async function getAttachmentUrl(path: string) {
  const supabase = createClient()
  const { data } = await supabase.storage.from('attachments').getPublicUrl(path)
  return data.publicUrl
}

export async function addTicketReply(ticketId: string, content: string): Promise<TicketActivity> {
  const supabase = createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    console.error('Error getting user:', userError)
    throw new Error('User must be logged in to add reply')
  }

  const { data, error } = await supabase
    .from('ticket_activities')
    .insert({
      ticket_id: ticketId,
      user_id: user.id,
      activity_type: 'comment',
      content,
      is_internal: false
    })
    .select('*, user:users(*)')
    .single()

  if (error) {
    console.error('Error adding reply:', error)
    throw error
  }

  if (!isTicketActivity(data)) {
    throw new Error('Invalid activity data received')
  }

  return data
} 