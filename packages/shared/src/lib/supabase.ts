import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// Singleton instance
let supabaseInstance: ReturnType<typeof createClientComponentClient> | null = null

// For client components
export const createClient = () => {
  if (!supabaseInstance) {
    supabaseInstance = createClientComponentClient()
  }
  return supabaseInstance
}

// Reset instance (useful for testing or when needed)
export const resetClient = () => {
  supabaseInstance = null
} 