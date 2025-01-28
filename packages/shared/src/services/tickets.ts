import { createClient } from '../lib/supabase'
import { TicketPriority, TicketStatus, isHighSeverity } from '../config/tickets'
import { Database } from '../types/database'

// Type aliases for better readability
type Tables = Database['public']['Tables']
export type BaseUser = Tables['users']['Row']
export type BaseTicket = Tables['tickets']['Row']
export type BaseTicketActivity = Tables['ticket_activities']['Row']
export type BaseAttachment = Tables['attachments']['Row']

// Type aliases for better readability
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
  activities?: TicketActivity[]
  client: User
  agent?: User
  attachments?: Attachment[]
}

export interface TicketActivity {
  id: string
  ticket_id: string
  user_id: string
  content: string
  activity_type: 'comment' | 'status_change' | 'assignment'
  created_at: string
  user: User
}

export interface DashboardStats {
  totalOpenTickets: number
  unassignedTickets: number
  highPriorityTickets: number
  myActiveTickets: number
}

export interface ClientDashboardStats {
  totalActiveTickets: number
  recentlyUpdatedTickets: number
  averageResolutionHours: number | null
  ticketsByPriority: {
    high: number
    medium: number
    low: number
  }
}

interface TicketInsertResponse {
  id: string;
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
    // Check nullable/optional fields
    (ticket.agent_id === null || typeof ticket.agent_id === 'string') &&
    (ticket.resolved_at === null || typeof ticket.resolved_at === 'string') &&
    // Check nested objects
    (typeof ticket.client === 'object' && ticket.client !== null &&
      typeof ticket.client.id === 'string' &&
      typeof ticket.client.email === 'string' &&
      typeof ticket.client.role === 'string') &&
    // Agent is optional
    (ticket.agent === undefined || ticket.agent === null || (
      typeof ticket.agent === 'object' &&
      typeof ticket.agent.id === 'string' &&
      typeof ticket.agent.email === 'string' &&
      typeof ticket.agent.role === 'string'
    )) &&
    // Attachments are optional
    (!ticket.attachments || Array.isArray(ticket.attachments)) &&
    // Activities are optional
    (!ticket.activities || Array.isArray(ticket.activities))
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
    // Create ticket first
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
      .single();

    if (ticketError) throw ticketError;
    // Type guard for ticket.id
    if (!ticket?.id || typeof ticket.id !== 'string') {
      throw new Error('Failed to create ticket');
    }

    // Generate embedding via API
    const ticketText = `
      Title: ${data.subject}
      Description: ${data.description}
      Priority: ${data.priority}
    `.trim();

    const embedResponse = await fetch('/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: ticketText })
    });

    if (embedResponse.ok) {
      const { embedding } = await embedResponse.json();
      
      // Store embedding
      await supabase.from('ticket_embeddings').upsert({
        id: ticket.id,
        embedding,
        ticket_text: ticketText
      });
    }

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

    return ticket.id;
  } catch (error) {
    console.error('Error creating ticket:', error);
    throw new Error('Failed to create ticket');
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
      ),
      activities:ticket_activities(
        id,
        activity_type,
        content,
        created_at,
        user:users(id, email, full_name)
      )
    `)
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

  // Create the comment
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

  // Add embedding update
  try {
    await fetch('/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        text: content,
        type: 'comment',
        ticketId 
      })
    });
  } catch (error) {
    console.error('Failed to update embeddings:', error);
    // Don't throw - we don't want to fail comment creation if embedding fails
  }

  // Check if user is admin/agent
  const { data: userData, error: userRoleError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  console.log('User role check:', { userData, userRoleError })

  if (!userRoleError && (userData?.role === 'admin' || userData?.role === 'agent')) {

    console.log('ticketId', ticketId)
    // Check if ticket was created from email
    const { data: emailData } = await supabase
      .from('ticket_emails')
      .select('id')
      .eq('ticket_id', ticketId)

    console.log('Email data check:', { emailData })

    if (Array.isArray(emailData) && emailData.length > 0) {  // Ensure emailData is an array and has items
      // This ticket has email history, send the comment as an email
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) throw new Error('No session found')

        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/comment-to-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            ticketId,
            commentId: data.id,
            content,
            userId: user.id
          })
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error('Comment-to-email error:', errorText)
        }
      } catch (error) {
        console.error('Failed to send comment as email:', error)
        // Don't throw error since comment was created successfully
      }
    }
  }

  return data
}

export async function getAgentDashboardStats(): Promise<DashboardStats> {
  const supabase = createClient()
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('Failed to get current user')

  // Fetch all relevant tickets in one query for efficiency
  const { data: tickets, error: ticketsError } = await supabase
    .from('tickets')
    .select('*')
    .in('status', ['new', 'in_progress']) // Get both new and in_progress tickets

  if (ticketsError) {
    console.error('Error fetching tickets:', ticketsError)
    throw new Error('Failed to fetch ticket stats')
  }

  if (!tickets) {
    throw new Error('No tickets data received')
  }

  const stats: DashboardStats = {
    // Total open = all tickets that need attention (new + in_progress)
    totalOpenTickets: tickets.length,
    // Unassigned = new tickets waiting for an agent
    unassignedTickets: tickets.filter(t => !t.agent_id && t.status === 'new').length,
    // High priority = urgent matters regardless of status
    highPriorityTickets: tickets.filter(t => t.priority === 'high' || t.priority === 'urgent').length,
    // My active = tickets I'm currently working on
    myActiveTickets: tickets.filter(t => t.agent_id === user.id && t.status === 'in_progress').length
  }

  return stats
}

export async function assignTicket(ticketId: string): Promise<Ticket> {
  console.log('Attempting to assign ticket:', ticketId)
  const supabase = createClient()
  
  // Get current user (agent)
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    console.error('Error getting user:', userError)
    throw new Error('User must be logged in to assign ticket')
  }

  // First verify the ticket exists and is unassigned
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
    .is('agent_id', null)
    .single()

  if (fetchError) {
    console.error('Error fetching ticket:', fetchError)
    throw new Error('Failed to fetch ticket')
  }

  if (!existingTicket) {
    throw new Error('Ticket not found or already assigned')
  }

  if (!isTicket(existingTicket)) {
    console.error('Invalid ticket data:', existingTicket)
    throw new Error('Invalid ticket data received')
  }

  console.log('Found unassigned ticket:', existingTicket)

  // Update the ticket with the agent assignment and change status to in_progress
  const { error: updateError } = await supabase
    .from('tickets')
    .update({ 
      agent_id: user.id,
      status: 'in_progress',
      updated_at: new Date().toISOString()
    })
    .eq('id', ticketId)
    .is('agent_id', null) // Extra safety check to prevent race conditions

  if (updateError) {
    console.error('Error updating ticket:', updateError)
    throw updateError
  }

  // Create an activity record for the assignment
  const { error: activityError } = await supabase
    .from('ticket_activities')
    .insert({
      ticket_id: ticketId,
      user_id: user.id,
      activity_type: 'agent_assignment',
      content: 'Ticket assigned to agent',
      is_internal: true
    })

  if (activityError) {
    console.error('Error creating activity record:', activityError)
    // Don't throw here as the main assignment was successful
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

  console.log('Successfully assigned ticket:', updatedTicket)
  return updatedTicket
}

export async function closeTicket(ticketId: string): Promise<Ticket> {
  console.log('Attempting to close ticket:', ticketId)
  const supabase = createClient()
  
  // Get current user (agent)
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    console.error('Error getting user:', userError)
    throw new Error('User must be logged in to close ticket')
  }

  // First verify the ticket exists and is assigned to the current agent
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
    .eq('agent_id', user.id)
    .single()

  if (fetchError) {
    console.error('Error fetching ticket:', fetchError)
    throw new Error('Failed to fetch ticket')
  }

  if (!existingTicket) {
    throw new Error('Ticket not found or not assigned to you')
  }

  if (!isTicket(existingTicket)) {
    console.error('Invalid ticket data:', existingTicket)
    throw new Error('Invalid ticket data received')
  }

  console.log('Found assigned ticket:', existingTicket)

  // Update the ticket status to closed
  const { error: updateError } = await supabase
    .from('tickets')
    .update({ 
      status: 'closed',
      updated_at: new Date().toISOString()
    })
    .eq('id', ticketId)
    .eq('agent_id', user.id)

  if (updateError) {
    console.error('Error updating ticket:', updateError)
    throw updateError
  }

  // Create an activity record for the status change
  const { error: activityError } = await supabase
    .from('ticket_activities')
    .insert({
      ticket_id: ticketId,
      user_id: user.id,
      activity_type: 'status_change',
      content: 'Ticket closed',
      is_internal: true
    })

  if (activityError) {
    console.error('Error creating activity record:', activityError)
    // Don't throw here as the main update was successful
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

  console.log('Successfully closed ticket:', updatedTicket)
  return updatedTicket
}

export async function getMyTickets(): Promise<Ticket[]> {
  const supabase = createClient()
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('Failed to get current user')

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
      ),
      activities:ticket_activities(
        id,
        activity_type,
        content,
        created_at,
        user:users(id, email, full_name)
      )
    `)
    .eq('agent_id', user.id)
    .neq('status', 'cancelled')
    .order('updated_at', { ascending: false })

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

export async function unassignTicket(ticketId: string): Promise<Ticket> {
  console.log('Attempting to unassign ticket:', ticketId)
  const supabase = createClient()
  
  // Get current user (agent)
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    console.error('Error getting user:', userError)
    throw new Error('User must be logged in to unassign ticket')
  }

  // First verify the ticket exists and is assigned to the current agent
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
    .eq('agent_id', user.id)
    .single()

  if (fetchError) {
    console.error('Error fetching ticket:', fetchError)
    throw new Error('Failed to fetch ticket')
  }

  if (!existingTicket) {
    throw new Error('Ticket not found or not assigned to you')
  }

  if (!isTicket(existingTicket)) {
    console.error('Invalid ticket data:', existingTicket)
    throw new Error('Invalid ticket data received')
  }

  console.log('Found assigned ticket:', existingTicket)

  // Update the ticket to remove agent and set status back to new
  const { error: updateError } = await supabase
    .from('tickets')
    .update({ 
      agent_id: null,
      status: 'new',
      updated_at: new Date().toISOString()
    })
    .eq('id', ticketId)
    .eq('agent_id', user.id)

  if (updateError) {
    console.error('Error updating ticket:', updateError)
    throw updateError
  }

  // Create an activity record for the unassignment
  const { error: activityError } = await supabase
    .from('ticket_activities')
    .insert({
      ticket_id: ticketId,
      user_id: user.id,
      activity_type: 'agent_assignment',
      content: 'Ticket unassigned from agent',
      is_internal: true
    })

  if (activityError) {
    console.error('Error creating activity record:', activityError)
    // Don't throw here as the main update was successful
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

  console.log('Successfully unassigned ticket:', updatedTicket)
  return updatedTicket
}

export async function getClientDashboardStats(): Promise<ClientDashboardStats> {
  const supabase = createClient()
  
  // Get the current user's ID
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    throw new Error('Failed to get user')
  }

  const now = new Date()
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Get active tickets count (status not 'closed' or 'cancelled')
  const { count: activeCount, error: activeError } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', user.id)
    .not('status', 'in', '("closed","cancelled")')

  if (activeError) throw activeError

  // Get recently updated tickets count
  const { count: recentCount, error: recentError } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', user.id)
    .gt('updated_at', twentyFourHoursAgo.toISOString())

  if (recentError) throw recentError

  // Get average resolution time for tickets resolved in last 30 days
  const { data: resolvedTickets, error: resolvedError } = await supabase
    .from('tickets')
    .select('created_at, resolved_at')
    .eq('client_id', user.id)
    .eq('status', 'closed')
    .gt('resolved_at', thirtyDaysAgo.toISOString())
    .returns<Array<{ created_at: string; resolved_at: string | null }>>()

  if (resolvedError) throw resolvedError

  // Calculate average resolution time
  let averageResolutionHours: number | null = null
  if (resolvedTickets.length > 0) {
    const totalHours = resolvedTickets.reduce((sum: number, ticket: { created_at: string; resolved_at: string | null }) => {
      if (!ticket.resolved_at) return sum
      const created = new Date(ticket.created_at)
      const resolved = new Date(ticket.resolved_at)
      return sum + (resolved.getTime() - created.getTime()) / (1000 * 60 * 60)
    }, 0)
    averageResolutionHours = Math.round(totalHours / resolvedTickets.length)
  }

  // Get tickets by priority
  const { data: priorityTickets, error: priorityError } = await supabase
    .from('tickets')
    .select('priority')
    .eq('client_id', user.id)
    .not('status', 'in', '("closed","cancelled")')
    .returns<Array<{ priority: TicketPriority }>>()

  if (priorityError) throw priorityError

  const ticketsByPriority = {
    high: 0,
    medium: 0,
    low: 0
  }

  priorityTickets.forEach((ticket: { priority: TicketPriority }) => {
    if (isHighSeverity(ticket.priority)) {
      ticketsByPriority.high++
    } else if (ticket.priority === 'medium') {
      ticketsByPriority.medium++
    } else {
      ticketsByPriority.low++
    }
  })

  return {
    totalActiveTickets: activeCount ?? 0,
    recentlyUpdatedTickets: recentCount ?? 0,
    averageResolutionHours,
    ticketsByPriority
  }
}

export async function getUnassignedTickets(): Promise<Ticket[]> {
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
      ),
      activities:ticket_activities(
        id,
        activity_type,
        content,
        created_at,
        user:users(id, email, full_name)
      )
    `)
    .is('agent_id', null)
    .in('status', ['new', 'cancelled'])
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

export async function reopenTicket(ticketId: string): Promise<Ticket> {
  const supabase = createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    throw new Error('User must be logged in to reopen ticket')
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
    throw new Error('Ticket not found or access denied')
  }

  if (!isTicket(existingTicket)) {
    throw new Error('Invalid ticket data received')
  }

  // Perform the update
  const { error: updateError } = await supabase
    .from('tickets')
    .update({ 
      status: 'new',
      updated_at: new Date().toISOString(),
      agent_id: null // Remove agent assignment when reopening
    })
    .eq('id', ticketId)
    .eq('client_id', user.id)

  if (updateError) {
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
    throw new Error('Failed to fetch updated ticket')
  }

  if (!isTicket(updatedTicket)) {
    throw new Error('Invalid updated ticket data received')
  }

  return updatedTicket
}

export async function deleteTicket(ticketId: string): Promise<void> {
  console.log('Attempting to delete ticket:', ticketId)
  const supabase = createClient()
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    console.error('Error getting user:', userError)
    throw new Error('User must be logged in to delete ticket')
  }

  // Delete ticket embedding first (if exists)
  const { error: embeddingError } = await supabase
    .from('ticket_embeddings')
    .delete()
    .eq('id', ticketId)

  if (embeddingError) {
    console.error('Error deleting ticket embedding:', embeddingError)
    // Continue with deletion even if embedding deletion fails
  }

  // Delete the ticket (this will cascade to attachments, activities, and emails)
  const { error: deleteError } = await supabase
    .from('tickets')
    .delete()
    .eq('id', ticketId)

  if (deleteError) {
    console.error('Error deleting ticket:', deleteError)
    throw new Error('Failed to delete ticket')
  }

  console.log('Successfully deleted ticket:', ticketId)
} 