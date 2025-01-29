import { createServerClient } from '../supabase-server'
import { Database } from '../../types/database'

type Tables = Database['public']['Tables']
type TicketRow = Tables['tickets']['Row']
type TicketActivityRow = Tables['ticket_activities']['Row']
type TicketPriority = Database['public']['Enums']['ticket_priority']
type TicketStatus = Database['public']['Enums']['ticket_status']
type ActivityType = Database['public']['Enums']['activity_type']

interface TicketActionResult {
  success: boolean
  message: string
  ticket?: TicketRow
  error?: string
}

// Track all actions for analytics
interface ActionLog {
  tool: string
  agentId: string
  ticketNumber: number
  action: string
  success: boolean
  timestamp: string
}

export class TicketActionService {
  private supabase = createServerClient()

  // Status transition validation
  private readonly validTransitions: Record<TicketStatus, TicketStatus[]> = {
    'new': ['in_progress', 'cancelled'],
    'in_progress': [ 'cancelled', 'closed'],
    'resolved': ['closed', 'in_progress'],
    'closed': ['in_progress'],
    'cancelled': ['in_progress']
  }

  // Helper to get ticket ID and current state
  private async getTicketDetails(ticketNumber: number): Promise<{
    id: string;
    currentStatus: TicketStatus;
    currentAgentId: string | null;
  } | null> {
    const { data, error } = await this.supabase
      .from('tickets')
      .select('id, status, agent_id')
      .eq('number', ticketNumber)
      .single()

    if (error || !data) return null

    return {
      id: data.id,
      currentStatus: data.status as TicketStatus,
      currentAgentId: data.agent_id
    }
  }

  // Log actions for analytics
  private async logAction(log: ActionLog): Promise<void> {
    try {
      // Skip logging for comments since they're already in ticket_activities
      if (log.tool === 'comment') {
        return
      }

      // Get ticket ID first
      const { data: ticket } = await this.supabase
        .from('tickets')
        .select('id')
        .eq('number', log.ticketNumber)
        .single()

      if (!ticket?.id) {
        console.error('Failed to log action: Ticket not found')
        return
      }

      await this.supabase
        .from('ticket_activities')
        .insert({
          ticket_id: ticket.id,
          user_id: log.agentId,
          activity_type: log.tool as ActivityType,
          content: log.action,
          is_internal: true,
          metadata: { success: log.success, timestamp: log.timestamp }
        })
    } catch (error) {
      console.error('Failed to log action:', error)
    }
  }

  // Claim a ticket
  async claimTicket(ticketNumber: number, agentId: string): Promise<TicketActionResult> {
    try {
      const details = await this.getTicketDetails(ticketNumber)
      if (!details) {
        return { success: false, message: 'Ticket not found' }
      }

      if (details.currentAgentId) {
        return { success: false, message: 'Ticket is already assigned' }
      }

      const { data: ticket, error } = await this.supabase
        .from('tickets')
        .update({
          agent_id: agentId,
          status: 'in_progress' as const,
          updated_at: new Date().toISOString()
        })
        .eq('id', details.id)
        .select()
        .single()

      if (error) throw error

      await this.logAction({
        tool: 'agent_assignment',
        agentId,
        ticketNumber,
        action: 'Claimed ticket',
        success: true,
        timestamp: new Date().toISOString()
      })

      return {
        success: true,
        message: 'Ticket claimed successfully',
        ticket
      }
    } catch (error) {
      await this.logAction({
        tool: 'agent_assignment',
        agentId,
        ticketNumber,
        action: 'Failed to claim ticket',
        success: false,
        timestamp: new Date().toISOString()
      })

      return {
        success: false,
        message: 'Failed to claim ticket',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Unclaim a ticket
  async unclaimTicket(ticketNumber: number, agentId: string): Promise<TicketActionResult> {
    try {
      const details = await this.getTicketDetails(ticketNumber)
      if (!details) {
        return { success: false, message: 'Ticket not found' }
      }

      if (details.currentAgentId !== agentId) {
        return { success: false, message: 'Can only unclaim your own tickets' }
      }

      const { data: ticket, error } = await this.supabase
        .from('tickets')
        .update({
          agent_id: null,
          status: 'new',
          updated_at: new Date().toISOString()
        })
        .eq('id', details.id)
        .select()
        .single()

      if (error) throw error

      await this.logAction({
        tool: 'agent_assignment',
        agentId,
        ticketNumber,
        action: 'Unclaimed ticket',
        success: true,
        timestamp: new Date().toISOString()
      })

      return {
        success: true,
        message: 'Ticket unclaimed successfully',
        ticket
      }
    } catch (error) {
      await this.logAction({
        tool: 'agent_assignment',
        agentId,
        ticketNumber,
        action: 'Failed to unclaim ticket',
        success: false,
        timestamp: new Date().toISOString()
      })

      return {
        success: false,
        message: 'Failed to unclaim ticket',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Alias for backward compatibility
  async unassignTicket(ticketNumber: number, agentId: string): Promise<TicketActionResult> {
    return this.unclaimTicket(ticketNumber, agentId)
  }

  // Update ticket status
  async updateStatus(
    ticketNumber: number,
    newStatus: TicketStatus,
    agentId: string
  ): Promise<TicketActionResult> {
    try {
      const details = await this.getTicketDetails(ticketNumber)
      if (!details) {
        return { success: false, message: 'Ticket not found' }
      }

      if (details.currentAgentId !== agentId) {
        return { success: false, message: 'Can only update status of your own tickets' }
      }

      if (!this.validTransitions[details.currentStatus]?.includes(newStatus)) {
        return {
          success: false,
          message: `Cannot transition from ${details.currentStatus} to ${newStatus}`
        }
      }

      const { data: ticket, error } = await this.supabase
        .from('tickets')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', details.id)
        .select()
        .single()

      if (error) throw error

      await this.logAction({
        tool: 'status_change',
        agentId,
        ticketNumber,
        action: `Changed status to ${newStatus}`,
        success: true,
        timestamp: new Date().toISOString()
      })

      return {
        success: true,
        message: 'Status updated successfully',
        ticket
      }
    } catch (error) {
      await this.logAction({
        tool: 'status_change',
        agentId,
        ticketNumber,
        action: 'Failed to update status',
        success: false,
        timestamp: new Date().toISOString()
      })

      return {
        success: false,
        message: 'Failed to update status',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Add a comment
  async addComment(
    ticketNumber: number,
    content: string,
    agentId: string,
    isInternal: boolean = false
  ): Promise<TicketActionResult> {
    try {
      const details = await this.getTicketDetails(ticketNumber)
      if (!details) {
        return { success: false, message: 'Ticket not found' }
      }

      if (details.currentAgentId !== agentId) {
        return { success: false, message: 'Can only comment on your own tickets' }
      }

      // Single insert operation for the comment
      const { error } = await this.supabase
        .from('ticket_activities')
        .insert({
          ticket_id: details.id,
          user_id: agentId,
          content,
          activity_type: 'comment',
          is_internal: isInternal,
          metadata: { timestamp: new Date().toISOString() }
        })

      if (error) throw error

      return {
        success: true,
        message: 'Comment added successfully'
      }
    } catch (error) {
      console.error('Failed to add comment:', error)
      return {
        success: false,
        message: 'Failed to add comment',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Helper to validate ticket exists
  async validateTicket(ticketNumber: number): Promise<boolean> {
    const details = await this.getTicketDetails(ticketNumber)
    return details !== null
  }

  // Simplified self-assignment
  async assignToMe(ticketNumber: number, agentId: string): Promise<TicketActionResult> {
    return this.claimTicket(ticketNumber, agentId)
  }

  // Update priority
  async updatePriority(
    ticketNumber: number,
    priority: TicketPriority,
    agentId: string,
    comment?: string
  ): Promise<TicketActionResult> {
    try {
      const details = await this.getTicketDetails(ticketNumber)
      if (!details) {
        return { success: false, message: 'Ticket not found' }
      }

      if (details.currentAgentId !== agentId) {
        return { success: false, message: 'Can only update priority of your own tickets' }
      }

      const { data: ticket, error } = await this.supabase
        .from('tickets')
        .update({
          priority,
          updated_at: new Date().toISOString()
        })
        .eq('id', details.id)
        .select()
        .single()

      if (error) throw error

      await this.logAction({
        tool: 'priority_change',
        agentId,
        ticketNumber,
        action: `Changed priority to ${priority}`,
        success: true,
        timestamp: new Date().toISOString()
      })

      // Add comment if provided
      if (comment) {
        await this.addComment(ticketNumber, comment, agentId, true)
      }

      return {
        success: true,
        message: 'Priority updated successfully',
        ticket
      }
    } catch (error) {
      await this.logAction({
        tool: 'priority_change',
        agentId,
        ticketNumber,
        action: 'Failed to update priority',
        success: false,
        timestamp: new Date().toISOString()
      })

      return {
        success: false,
        message: 'Failed to update priority',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

// Export a singleton instance
export const ticketActionService = new TicketActionService()

// Export types
export type { TicketActionResult, TicketPriority, TicketStatus } 