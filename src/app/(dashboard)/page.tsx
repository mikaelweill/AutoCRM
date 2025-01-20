'use client'

import { useState } from 'react'
import { useAuth } from "@/contexts/AuthContext"
import { PlusCircle } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { CreateTicketForm } from '@/components/tickets/CreateTicketForm'
import { TicketList } from '@/components/tickets/TicketList'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'

export default function DashboardPage() {
  const { user } = useAuth()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const handleCreateTicket = async (ticketId: string) => {
    // Close modal and potentially refresh tickets list
    setIsCreateModalOpen(false)
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Tickets</h1>
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
  )
} 