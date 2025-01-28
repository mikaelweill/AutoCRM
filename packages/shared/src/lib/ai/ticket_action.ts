import { createServerClient } from '../supabase-server'
import { Database } from '../../types/database'

type Tables = Database['public']['Tables']
type TicketRow = Tables['tickets']['Row']
type TicketActivityRow = Tables['ticket_activities']['Row']
type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'
type TicketStatus = 'new' | 'in_progress' | 'resolved' | 'closed' | 'cancelled'

interface TicketActionResult {
  success: boolean
  message: string
  ticket?: TicketRow
  error?: string
}

interface TicketUpdateParams {
  ticketNumber: number  // Changed from ticketId to ticketNumber
  status?: TicketStatus
  priority?: TicketPriority
  agentId?: string | null  // For assign/unassign
  currentAgentId: string  // Changed from userId to be more specific
  comment?: {
    content: string
    isInternal?: boolean
  }
}

export class TicketActionService {
  private supabase = createServerClient()

  // Helper to get ticket ID from number
  private async getTicketIdFromNumber(ticketNumber: number): Promise<string> {
    const { data, error } = await this.supabase
      .from('tickets')
      .select('id')
      .eq('number', ticketNumber)
      .single()

    if (error || !data) {
      throw new Error(`Ticket #${ticketNumber} not found`)
    }

    return data.id
  }

  async updateTicket(params: TicketUpdateParams): Promise<TicketActionResult> {
    try {
      const { ticketNumber, status, priority, agentId, currentAgentId, comment } = params
      
      // Get the actual ticket ID
      const ticketId = await this.getTicketIdFromNumber(ticketNumber)
      
      // Start a transaction for the update
      const { data: ticket, error: ticketError } = await this.supabase
        .from('tickets')
        .update({
          ...(status && { status }),
          ...(priority && { priority }),
          ...(agentId !== undefined && { agent_id: agentId }),
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId)
        .select('*')
        .single()

      if (ticketError) {
        throw new Error(`Failed to update ticket: ${ticketError.message}`)
      }

      // Add comment if provided
      if (comment) {
        const { error: commentError } = await this.supabase
          .from('ticket_activities')
          .insert({
            ticket_id: ticketId,
            user_id: currentAgentId,
            content: comment.content,
            activity_type: 'comment',
            is_internal: comment.isInternal || false
          })

        if (commentError) {
          throw new Error(`Failed to add comment: ${commentError.message}`)
        }
      }

      return {
        success: true,
        message: 'Ticket updated successfully',
        ticket
      }
    } catch (error) {
      console.error('Error in updateTicket:', error)
      return {
        success: false,
        message: 'Failed to update ticket',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  // Simplified to just handle self-assignment
  async assignToMe(ticketNumber: number, agentId: string): Promise<TicketActionResult> {
    return this.updateTicket({
      ticketNumber,
      agentId,
      currentAgentId: agentId,  // Same ID since it's self-assignment
      comment: {
        content: 'Ticket self-assigned',
        isInternal: true
      }
    })
  }

  async unassignTicket(ticketNumber: number, currentAgentId: string): Promise<TicketActionResult> {
    return this.updateTicket({
      ticketNumber,
      agentId: null,
      currentAgentId,
      comment: {
        content: 'Ticket unassigned',
        isInternal: true
      }
    })
  }

  async addComment(
    ticketNumber: number,
    content: string,
    currentAgentId: string,
    isInternal: boolean = false
  ): Promise<TicketActionResult> {
    return this.updateTicket({
      ticketNumber,
      currentAgentId,
      comment: {
        content,
        isInternal
      }
    })
  }

  async updateStatus(
    ticketNumber: number,
    status: TicketStatus,
    currentAgentId: string,
    comment?: string
  ): Promise<TicketActionResult> {
    return this.updateTicket({
      ticketNumber,
      status,
      currentAgentId,
      ...(comment && {
        comment: {
          content: comment,
          isInternal: true
        }
      })
    })
  }

  async updatePriority(
    ticketNumber: number,
    priority: TicketPriority,
    currentAgentId: string,
    comment?: string
  ): Promise<TicketActionResult> {
    return this.updateTicket({
      ticketNumber,
      priority,
      currentAgentId,
      ...(comment && {
        comment: {
          content: comment,
          isInternal: true
        }
      })
    })
  }

  // Helper to validate ticket exists
  async validateTicket(ticketNumber: number): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('tickets')
      .select('id')
      .eq('number', ticketNumber)
      .single()

    if (error || !data) {
      return false
    }
    return true
  }
}

// Export a singleton instance
export const ticketActionService = new TicketActionService()

// Export types
export type { TicketActionResult, TicketUpdateParams, TicketPriority, TicketStatus } 