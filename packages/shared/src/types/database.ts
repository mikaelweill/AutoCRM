export type UserRole = 'client' | 'agent' | 'admin'
export type TicketStatus = 'new' | 'in_progress' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'
export type ActivityType = 
  | 'comment'
  | 'status_change'
  | 'priority_change'
  | 'agent_assignment'
  | 'attachment_added'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: UserRole
          created_at: string
          updated_at: string
          last_seen: string | null
          metadata: Record<string, any>
        }
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['users']['Insert']>
      }
      tickets: {
        Row: {
          id: string
          number: number
          client_id: string
          agent_id: string | null
          subject: string
          description: string
          status: TicketStatus
          priority: TicketPriority
          created_at: string
          updated_at: string
          resolved_at: string | null
          metadata: Record<string, any>
        }
        Insert: Omit<Database['public']['Tables']['tickets']['Row'], 'id' | 'number' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['tickets']['Insert']>
      }
      ticket_activities: {
        Row: {
          id: string
          ticket_id: string
          user_id: string
          activity_type: ActivityType
          content: string | null
          is_internal: boolean
          created_at: string
          metadata: Record<string, any>
        }
        Insert: Omit<Database['public']['Tables']['ticket_activities']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['ticket_activities']['Insert']>
      }
      attachments: {
        Row: {
          id: string
          ticket_id: string
          user_id: string
          file_name: string
          file_type: string
          file_size: number
          storage_path: string
          created_at: string
          metadata: Record<string, any>
        }
        Insert: Omit<Database['public']['Tables']['attachments']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['attachments']['Insert']>
      }
      knowledge_base_articles: {
        Row: {
          id: string
          title: string
          content: string
          category: string
          is_published: boolean
          created_at: string
          updated_at: string
          metadata: Record<string, any>
        }
        Insert: Omit<Database['public']['Tables']['knowledge_base_articles']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['knowledge_base_articles']['Insert']>
      }
    }
  }
} 