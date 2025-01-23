'use client'

import { useState, useEffect } from 'react'
import { Ticket } from '../../services/tickets'
import { TicketStatus, TicketPriority } from '../../config/tickets'
import { TicketTemplate } from './TicketTemplate'
import { TicketFilters } from './TicketFilters'
import { Dialog } from '../ui/Dialog'

interface TicketListProps {
  tickets: Ticket[]
  onTicketClick?: (ticket: Ticket) => void
  renderActions?: (ticket: Ticket) => React.ReactNode
  getAttachmentUrl?: (path: string) => Promise<string>
  defaultFilters?: {
    statuses?: TicketStatus[]
    priorities?: TicketPriority[]
  }
  // New props for portal-specific behavior
  readOnlyComments?: boolean
  hideComments?: boolean
  hideAttachments?: boolean
  renderHeader?: React.ReactNode
  renderCreateForm?: React.ReactNode
}

interface FilterState {
  statuses: TicketStatus[]
  priorities: TicketPriority[]
  searchTerm: string
}

const STORAGE_KEY = 'ticketFilters'

export function TicketList({
  tickets,
  onTicketClick,
  renderActions,
  getAttachmentUrl,
  defaultFilters,
  readOnlyComments = false,
  hideComments = false,
  hideAttachments = false,
  renderHeader,
  renderCreateForm
}: TicketListProps) {
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  
  // Initialize filters from localStorage or defaults
  const [filters, setFilters] = useState<FilterState>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch (e) {
          console.warn('Failed to parse saved filters:', e)
        }
      }
    }
    return {
      statuses: defaultFilters?.statuses || [],
      priorities: defaultFilters?.priorities || [],
      searchTerm: ''
    }
  })

  // Save filters to localStorage when they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters))
  }, [filters])

  // Filter tickets based on current filters
  const filteredTickets = tickets.filter(ticket => {
    const matchesStatus = filters.statuses.length === 0 || filters.statuses.includes(ticket.status)
    const matchesPriority = filters.priorities.length === 0 || filters.priorities.includes(ticket.priority)
    const matchesSearch = !filters.searchTerm || 
      ticket.subject.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      ticket.description.toLowerCase().includes(filters.searchTerm.toLowerCase())
    
    return matchesStatus && matchesPriority && matchesSearch
  })

  const handleTicketClick = (ticket: Ticket) => {
    setSelectedTicket(ticket)
    onTicketClick?.(ticket)
  }

  return (
    <div className="space-y-6">
      {/* Header Section with Create Button */}
      {renderHeader && (
        <div className="flex justify-between items-center">
          {renderHeader}
          {renderCreateForm && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
            >
              Create Ticket
            </button>
          )}
        </div>
      )}

      {/* Filters Section */}
      <div className="bg-white shadow rounded-lg p-4">
        <TicketFilters
          selectedStatuses={filters.statuses}
          selectedPriorities={filters.priorities}
          onStatusChange={statuses => setFilters(prev => ({ ...prev, statuses }))}
          onPriorityChange={priorities => setFilters(prev => ({ ...prev, priorities }))}
        />
      </div>

      {/* Results Section */}
      {filteredTickets.length === 0 ? (
        <div className="text-center py-8 bg-white shadow rounded-lg">
          <p className="text-gray-500">No tickets match your filters</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTickets.map(ticket => (
            <TicketTemplate
              key={ticket.id}
              ticket={ticket}
              onTicketClick={handleTicketClick}
              getAttachmentUrl={getAttachmentUrl}
              renderActions={renderActions}
              hideComments={hideComments}
              hideAttachments={hideAttachments}
              readOnlyComments={readOnlyComments}
            />
          ))}
        </div>
      )}

      {/* Detail View Modal */}
      <Dialog
        isOpen={selectedTicket !== null}
        onClose={() => setSelectedTicket(null)}
        title={selectedTicket ? `Ticket #${selectedTicket.number}` : ''}
      >
        {selectedTicket && (
          <TicketTemplate
            ticket={selectedTicket}
            getAttachmentUrl={getAttachmentUrl}
            renderActions={renderActions}
            hideComments={hideComments}
            hideAttachments={hideAttachments}
            readOnlyComments={readOnlyComments}
            isDetailView={true}
          />
        )}
      </Dialog>

      {/* Create Ticket Modal */}
      {renderCreateForm && (
        <Dialog
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Create New Ticket"
        >
          {renderCreateForm}
        </Dialog>
      )}
    </div>
  )
} 