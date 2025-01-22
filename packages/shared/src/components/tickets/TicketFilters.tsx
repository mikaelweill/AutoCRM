'use client'

import { TICKET_PRIORITIES, TICKET_STATUSES, TicketPriority, TicketStatus } from '../../config/tickets'

interface TicketFiltersProps {
  selectedStatuses: TicketStatus[]
  selectedPriorities: TicketPriority[]
  onStatusChange: (statuses: TicketStatus[]) => void
  onPriorityChange: (priorities: TicketPriority[]) => void
}

export function TicketFilters({
  selectedStatuses,
  selectedPriorities,
  onStatusChange,
  onPriorityChange
}: TicketFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Status Filters */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Status</h3>
        <div className="flex flex-wrap gap-2">
          {TICKET_STATUSES.map(status => (
            <button
              key={status.value}
              onClick={() => {
                if (selectedStatuses.includes(status.value)) {
                  onStatusChange(selectedStatuses.filter(s => s !== status.value))
                } else {
                  onStatusChange([...selectedStatuses, status.value])
                }
              }}
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                selectedStatuses.includes(status.value)
                  ? status.color
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {status.label}
            </button>
          ))}
        </div>
      </div>

      {/* Priority Filters */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Priority</h3>
        <div className="flex flex-wrap gap-2">
          {TICKET_PRIORITIES.map(priority => (
            <button
              key={priority.value}
              onClick={() => {
                if (selectedPriorities.includes(priority.value)) {
                  onPriorityChange(selectedPriorities.filter(p => p !== priority.value))
                } else {
                  onPriorityChange([...selectedPriorities, priority.value])
                }
              }}
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                selectedPriorities.includes(priority.value)
                  ? priority.color
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {priority.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
} 