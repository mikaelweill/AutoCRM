import { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '../lib/supabase'
import { Database } from '../types/database'

export abstract class BaseService {
  protected supabase: SupabaseClient<Database>
  
  constructor() {
    this.supabase = createClient()
  }

  protected async getCurrentUser() {
    const { data: { user }, error } = await this.supabase.auth.getUser()
    if (error) {
      console.error('Error getting user:', error)
      throw new Error('Failed to get current user')
    }
    if (!user) {
      throw new Error('No authenticated user')
    }
    return user
  }

  protected async requireUser() {
    const user = await this.getCurrentUser()
    if (!user) {
      throw new Error('Authentication required')
    }
    return user
  }

  protected handleError(error: unknown, message: string): never {
    console.error(message, error)
    throw new Error(message)
  }
} 