'use client'

import { useState } from 'react'
import { useAuth } from "@/contexts/AuthContext"
import { PlusCircle } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { CreateTicketForm } from '@/components/tickets/CreateTicketForm'

export default function Home() {
  const { user } = useAuth()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const handleCreateTicket = async (data: {
    subject: string
    description: string
    priority: 'low' | 'medium' | 'high'
    attachments?: File[]
  }) => {
    // TODO: Implement ticket creation
    console.log('Creating ticket:', data)
    setIsCreateModalOpen(false)
  }

  return (
    <div className="max-w-7xl mx-auto px-4">
      <header className="mb-8">
        <h2 className="text-2xl font-semibold">Welcome back, {user?.email}</h2>
        <p className="text-gray-600">Manage your support requests</p>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="p-6 bg-white rounded-lg shadow-sm border">
          <h3 className="text-gray-500 mb-2">Active Tickets</h3>
          <p className="text-3xl font-semibold">0</p>
        </div>
        <div className="p-6 bg-white rounded-lg shadow-sm border">
          <h3 className="text-gray-500 mb-2">Resolved Tickets</h3>
          <p className="text-3xl font-semibold">0</p>
        </div>
        <div className="p-6 bg-white rounded-lg shadow-sm border">
          <h3 className="text-gray-500 mb-2">Total Tickets</h3>
          <p className="text-3xl font-semibold">0</p>
        </div>
      </div>

      {/* Create Ticket Button */}
      <div className="mb-8">
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusCircle className="w-5 h-5 mr-2" />
          Create New Ticket
        </button>
      </div>

      {/* Recent Tickets */}
      <section className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Recent Tickets</h3>
          <button className="text-blue-600 hover:text-blue-800">
            View All
          </button>
        </div>
        
        <div className="space-y-4">
          {/* We'll replace this with actual tickets */}
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <p className="text-gray-500 text-center py-4">No tickets yet</p>
          </div>
        </div>
      </section>

      {/* Create Ticket Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Ticket"
      >
        <CreateTicketForm
          onSubmit={handleCreateTicket}
          onCancel={() => setIsCreateModalOpen(false)}
        />
      </Modal>
    </div>
  )
} 