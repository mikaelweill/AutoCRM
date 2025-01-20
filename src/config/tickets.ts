export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'

export const TICKET_PRIORITIES: {
  value: TicketPriority
  label: string
  color: string
  badgeColor?: string // For displaying in lists/details
  description?: string // Help text to guide users
}[] = [
  { 
    value: 'low',
    label: 'Low',
    color: 'bg-green-50 border-green-200 text-green-700',
    badgeColor: 'bg-green-100 text-green-800',
    description: 'Minor issues, no immediate impact'
  },
  { 
    value: 'medium',
    label: 'Medium',
    color: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    badgeColor: 'bg-yellow-100 text-yellow-800',
    description: 'Important issues requiring attention'
  },
  { 
    value: 'high',
    label: 'High',
    color: 'bg-red-50 border-red-200 text-red-700',
    badgeColor: 'bg-red-100 text-red-800',
    description: 'Critical issues needing quick resolution'
  },
  { 
    value: 'urgent',
    label: 'Urgent',
    color: 'bg-purple-50 border-purple-200 text-purple-700',
    badgeColor: 'bg-purple-100 text-purple-800',
    description: 'Emergency issues requiring immediate action'
  }
]

// Helper function to get priority details
export function getPriorityDetails(priority: TicketPriority) {
  return TICKET_PRIORITIES.find(p => p.value === priority)
}

// Helper to check if a priority is high severity (for special handling)
export function isHighSeverity(priority: TicketPriority) {
  return priority === 'high' || priority === 'urgent'
} 