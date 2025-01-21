export const env = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  },
  validate() {
    if (!this.supabase.url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
    if (!this.supabase.anonKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')
    return this
  }
} as const

// Validate on import
env.validate() 