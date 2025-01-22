'use client'

import { useState } from 'react'
import { useAuth } from "shared/src/contexts/AuthContext"
import { CreateTicketForm } from 'shared/src/components/tickets/CreateTicketForm'
import { TicketList } from 'shared/src/components/tickets/TicketList'
import { Dialog } from 'shared/src/components/ui/Dialog'
import { Button } from 'shared/src/components/ui/Button'

export default function MyTicketsPage() {
  const { user } = useAuth()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const handleCreateTicket = async (ticketId: string) => {
    // Close modal and potentially refresh tickets list
    setIsCreateModalOpen(false)
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-3xl mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">My Tickets</h1>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            Create Ticket
          </Button>
        </div>

        <TicketList />

        <Dialog
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Create New Ticket"
        >
          <CreateTicketForm
            onSuccess={handleCreateTicket}
            onCancel={() => setIsCreateModalOpen(false)}
          />
        </Dialog>
      </div>
    </div>
  )
} 