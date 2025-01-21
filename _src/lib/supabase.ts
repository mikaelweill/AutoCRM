import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// For client components
export const createClient = () => {
  return createClientComponentClient()
} 