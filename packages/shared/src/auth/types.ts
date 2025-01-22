import { User } from '@supabase/supabase-js'

export type UserRole = 'client' | 'agent' | 'admin'

export type AppMetadata = {
  provider: string
  providers: string[]
  user_role: UserRole
}

export type AuthUser = User & {
  app_metadata: AppMetadata
  user_role: UserRole // duplicated at root level for convenience
}

export type AuthError = {
  message: string
  code?: string
} 