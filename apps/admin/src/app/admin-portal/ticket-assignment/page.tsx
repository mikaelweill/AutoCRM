'use client'

import { useState, useEffect } from 'react'
import { createClient } from 'shared/src/lib/supabase'
import { TICKET_PRIORITIES, TICKET_STATUSES, getStatusDetails, getPriorityDetails } from 'shared/src/config/tickets'
import { ChevronUp, ChevronDown } from 'lucide-react'

interface TicketRow {
  id: string
  number: number
  subject: string
  status: string
  priority: string
  created_at: string
  agent_id: string | null
  client: {
    id: string
    name: string
    email: string
  }
  agent?: {
    id: string
    name: string
    email: string
  }
}

interface Agent {
  id: string
  name: string
  email: string
}

type SortField = 'number' | 'client' | 'agent' | 'subject' | 'status' | 'priority' | 'created_at'
type SortDirection = 'asc' | 'desc'

interface SortConfig {
  field: SortField
  direction: SortDirection
}

export default function TicketAssignmentPage() {
  const [tickets, setTickets] = useState<TicketRow[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sort, setSort] = useState<SortConfig>({ field: 'created_at', direction: 'desc' })
  const supabase = createClient()

  useEffect(() => {
    fetchData()

    // Subscribe to ticket changes
    const channel = supabase
      .channel('ticket-assignment-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets'
        },
        () => {
          console.log('Tickets updated, refreshing...')
          fetchData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchData() {
    try {
      // Fetch tickets with client and agent info
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('tickets')
        .select(`
          id,
          number,
          subject,
          status,
          priority,
          created_at,
          agent_id,
          client:client_id(id, email, full_name),
          agent:agent_id(id, email, full_name)
        `)
        .order('created_at', { ascending: false })

      if (ticketsError) throw ticketsError

      // Fetch all agents
      const { data: agentsData, error: agentsError } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('role', 'agent')

      if (agentsError) throw agentsError

      // Transform the data
      const transformedTickets = ticketsData.map((ticket: any) => ({
        id: ticket.id,
        number: ticket.number,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        created_at: ticket.created_at,
        agent_id: ticket.agent_id,
        client: {
          id: ticket.client.id,
          name: ticket.client.full_name || ticket.client.email,
          email: ticket.client.email
        },
        agent: ticket.agent ? {
          id: ticket.agent.id,
          name: ticket.agent.full_name || ticket.agent.email,
          email: ticket.agent.email
        } : undefined
      }))

      const transformedAgents = agentsData.map((agent: any) => ({
        id: agent.id,
        name: agent.full_name || agent.email,
        email: agent.email
      }))

      setTickets(transformedTickets)
      setAgents(transformedAgents)
      setError(null)
    } catch (err) {
      console.error('Error fetching data:', err)
      setError('Failed to load tickets')
    } finally {
      setLoading(false)
    }
  }

  async function updateTicket(ticketId: string, updates: Partial<TicketRow>) {
    try {
      const { error } = await supabase
        .from('tickets')
        .update(updates)
        .eq('id', ticketId)

      if (error) throw error

      // The subscription will handle the refresh
    } catch (err) {
      console.error('Error updating ticket:', err)
      // You might want to show a toast or error message here
    }
  }

  function handleSort(field: SortField) {
    setSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  function getSortedTickets() {
    return [...tickets].sort((a, b) => {
      const direction = sort.direction === 'asc' ? 1 : -1
      
      switch (sort.field) {
        case 'number':
          return (a.number - b.number) * direction
        case 'client':
          return (a.client.name.localeCompare(b.client.name)) * direction
        case 'agent':
          const aName = a.agent?.name || ''
          const bName = b.agent?.name || ''
          return aName.localeCompare(bName) * direction
        case 'subject':
          return a.subject.localeCompare(b.subject) * direction
        case 'status':
          return a.status.localeCompare(b.status) * direction
        case 'priority':
          return a.priority.localeCompare(b.priority) * direction
        case 'created_at':
          return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * direction
        default:
          return 0
      }
    })
  }

  const SortHeader = ({ field, label }: { field: SortField; label: string }) => (
    <th 
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        <div className="flex flex-col">
          <ChevronUp 
            className={`h-3 w-3 ${sort.field === field && sort.direction === 'asc' ? 'text-blue-600' : 'text-gray-400'}`}
          />
          <ChevronDown 
            className={`h-3 w-3 ${sort.field === field && sort.direction === 'desc' ? 'text-blue-600' : 'text-gray-400'}`}
          />
        </div>
      </div>
    </th>
  )

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Ticket Assignment</h2>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <SortHeader field="number" label="ID" />
              <SortHeader field="client" label="Client" />
              <SortHeader field="agent" label="Agent" />
              <SortHeader field="subject" label="Title" />
              <SortHeader field="status" label="Status" />
              <SortHeader field="priority" label="Priority" />
              <SortHeader field="created_at" label="Created" />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {getSortedTickets().map(ticket => (
              <tr key={ticket.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {ticket.number}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">{ticket.client.name}</div>
                    <div className="text-gray-500">{ticket.client.email}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    className="text-sm border-gray-300 rounded-md"
                    value={ticket.agent?.id || ''}
                    onChange={(e) => {
                      const agentId = e.target.value || null
                      updateTicket(ticket.id, { 
                        agent_id: agentId,
                        // If assigning agent, set status to in_progress
                        status: agentId ? 'in_progress' : 'new'
                      })
                    }}
                  >
                    <option value="">Unassigned</option>
                    {agents.map(agent => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 max-w-md break-words">
                    {ticket.subject}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    className={`text-sm rounded-md px-3 py-1 font-medium ${
                      getStatusDetails(ticket.status as any)?.color || 'bg-gray-100 text-gray-800'
                    }`}
                    value={ticket.status}
                    onChange={(e) => {
                      const newStatus = e.target.value
                      // If status is being set to in_progress but no agent, show error
                      if (newStatus === 'in_progress' && !ticket.agent) {
                        alert('Please assign an agent first')
                        return
                      }
                      // If status is being set to new, remove agent
                      const updates: any = { status: newStatus }
                      if (newStatus === 'new') {
                        updates.agent_id = null
                      }
                      updateTicket(ticket.id, updates)
                    }}
                  >
                    {TICKET_STATUSES.map(status => (
                      <option 
                        key={status.value} 
                        value={status.value}
                        disabled={status.value === 'in_progress' && !ticket.agent}
                        className={status.color}
                      >
                        {status.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    className={`text-sm rounded-md px-3 py-1 font-medium ${
                      getPriorityDetails(ticket.priority as any)?.color || 'bg-gray-100 text-gray-800'
                    }`}
                    value={ticket.priority}
                    onChange={(e) => updateTicket(ticket.id, { priority: e.target.value })}
                  >
                    {TICKET_PRIORITIES.map(priority => (
                      <option 
                        key={priority.value} 
                        value={priority.value}
                        className={priority.color}
                      >
                        {priority.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(ticket.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
} 