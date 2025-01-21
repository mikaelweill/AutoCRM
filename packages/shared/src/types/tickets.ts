import { TicketPriority, TicketStatus } from '../config/tickets'
import { UserRole } from '../auth/types'

export interface User {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  created_at: string
  updated_at: string
  last_seen: string | null
  metadata: Record<string, any>
}

export interface Attachment {
  id: string
  ticket_id: string
  file_name: string
  file_type: string
  file_size: number
  storage_path: string
  created_at: string
}

export interface Ticket {
  id: string
  number: number
  subject: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  client_id: string
  agent_id: string | null
  created_at: string
  updated_at: string
  resolved_at: string | null
  client: User
  agent: User | null
  attachments?: Attachment[]
}

export interface TicketActivity {
  id: string
  ticket_id: string
  user_id: string
  activity_type: 'comment' | 'status_change' | 'priority_change' | 'agent_assignment' | 'attachment_added'
  content: string
  is_internal: boolean
  created_at: string
  user: Pick<User, 'id' | 'email' | 'full_name'>
}

export interface CreateTicketData {
  subject: string
  description: string
  priority: TicketPriority
  attachments?: File[]
} 