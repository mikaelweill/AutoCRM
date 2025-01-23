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
        <div className="flex flex-wrap gap-4 p-1">
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
              className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${
                selectedStatuses.includes(status.value)
                  ? `${status.color} ring-2 ring-offset-2 shadow-md font-bold scale-105`
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-200'
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
        <div className="flex flex-wrap gap-4 p-1">
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
              className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${
                selectedPriorities.includes(priority.value)
                  ? `${priority.color} ring-2 ring-offset-2 shadow-md font-bold scale-105`
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-200'
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