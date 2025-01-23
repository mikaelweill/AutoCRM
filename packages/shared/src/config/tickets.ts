export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TicketStatus = 'new' | 'in_progress' | 'closed' | 'cancelled'

export const TICKET_PRIORITIES: {
  value: TicketPriority
  label: string
  color: string
  badgeColor?: string
  description?: string
}[] = [
  { 
    value: 'low',
    label: 'Low',
    color: 'bg-green-100 text-green-800',
    badgeColor: 'bg-green-100 text-green-800',
    description: 'Minor issues, no immediate impact'
  },
  { 
    value: 'medium',
    label: 'Medium',
    color: 'bg-yellow-100 text-yellow-800',
    badgeColor: 'bg-yellow-100 text-yellow-800',
    description: 'Important issues requiring attention'
  },
  { 
    value: 'high',
    label: 'High',
    color: 'bg-red-100 text-red-800',
    badgeColor: 'bg-red-100 text-red-800',
    description: 'Critical issues needing quick resolution'
  },
  { 
    value: 'urgent',
    label: 'Urgent',
    color: 'bg-purple-100 text-purple-800',
    badgeColor: 'bg-purple-100 text-purple-800',
    description: 'Emergency issues requiring immediate action'
  }
]

export const TICKET_STATUSES: {
  value: TicketStatus
  label: string
  color: string
  description?: string
}[] = [
  {
    value: 'new',
    label: 'New',
    color: 'bg-blue-100 text-blue-800',
    description: 'Ticket has been created but not yet reviewed'
  },
  {
    value: 'in_progress',
    label: 'In Progress',
    color: 'bg-yellow-100 text-yellow-800',
    description: 'Ticket is being worked on'
  },
  {
    value: 'closed',
    label: 'Closed',
    color: 'bg-green-100 text-green-800',
    description: 'Ticket has been closed'
  },
  {
    value: 'cancelled',
    label: 'Cancelled',
    color: 'bg-red-100 text-red-800',
    description: 'Ticket has been cancelled'
  }
]

export function getPriorityDetails(priority: TicketPriority) {
  return TICKET_PRIORITIES.find(p => p.value === priority)
}

export function getStatusDetails(status: TicketStatus) {
  return TICKET_STATUSES.find(s => s.value === status)
}

export function isHighSeverity(priority: TicketPriority): boolean {
  return priority === 'high' || priority === 'urgent'
} 