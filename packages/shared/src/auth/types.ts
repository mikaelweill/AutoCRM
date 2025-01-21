import { User } from '@supabase/supabase-js'

export type UserRole = 'client' | 'agent' | 'admin'

export type AuthUser = User & {
  role?: UserRole
}

export type AuthError = {
  message: string
  code?: string
} 