import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create a single instance to be used throughout the app
export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'autocrm-auth',
    detectSessionInUrl: true,
    autoRefreshToken: true,
    flowType: 'pkce'
  }
})

// For backwards compatibility
export function createClient() {
  return supabase
} 