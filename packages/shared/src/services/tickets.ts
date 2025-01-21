import { SupabaseClient } from '@supabase/supabase-js'
import { CreateTicketData, Ticket, TicketActivity } from '../types/tickets'

export class TicketService {
  constructor(private supabase: SupabaseClient) {}

  async createTicket(data: CreateTicketData) {
    console.log('Creating ticket with data:', data)
    
    // First get the session
    const { data: { user }, error: sessionError } = await this.supabase.auth.getUser()
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
      const { data: ticket, error: ticketError } = await this.supabase
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
          const { error: uploadError } = await this.supabase.storage
            .from('attachments')
            .upload(path, file)

          if (uploadError) {
            console.error('Failed to upload attachment:', uploadError)
            continue
          }

          // Create attachment record
          const { error: attachmentError } = await this.supabase
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

  async getTickets() {
    const { data: tickets, error } = await this.supabase
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

    return tickets as Ticket[]
  }

  async cancelTicket(ticketId: string) {
    console.log('Attempting to cancel ticket:', ticketId)
    
    // Get the current user
    const { data: { user }, error: userError } = await this.supabase.auth.getUser()
    if (userError || !user) {
      console.error('Error getting user:', userError)
      throw new Error('User must be logged in to cancel ticket')
    }

    // First verify the ticket exists and belongs to the user
    const { data: existingTicket, error: fetchError } = await this.supabase
      .from('tickets')
      .select()
      .eq('id', ticketId)
      .eq('client_id', user.id)
      .single()

    if (fetchError || !existingTicket) {
      console.error('Error fetching ticket:', fetchError)
      throw new Error('Ticket not found or access denied')
    }

    // Perform the update with explicit conditions
    const { data: updateResult, error: updateError } = await this.supabase
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

    // Fetch the updated ticket
    const { data: updatedTicket, error: refetchError } = await this.supabase
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

    return updatedTicket as Ticket
  }

  async getAttachmentUrl(path: string) {
    const { data } = await this.supabase.storage.from('attachments').getPublicUrl(path)
    return data.publicUrl
  }

  async addTicketReply(ticketId: string, content: string) {
    // Get the current user
    const { data: { user }, error: userError } = await this.supabase.auth.getUser()
    if (userError || !user) {
      console.error('Error getting user:', userError)
      throw new Error('User must be logged in to add reply')
    }

    // Add the reply as a ticket activity
    const { data, error } = await this.supabase
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

    return data as TicketActivity
  }
} 