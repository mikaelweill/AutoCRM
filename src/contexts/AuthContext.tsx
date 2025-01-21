'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type AuthContextType = {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  const redirectBasedOnRole = async (accessToken: string) => {
    try {
      const response = await fetch('https://nkicqyftdkfphifgvejh.supabase.co/functions/v1/check-role', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Edge function error:', errorText)
        throw new Error('Failed to check role')
      }
      
      const roleData = await response.json()
      console.log('Edge Function returned role data:', roleData)

      if (roleData.isClient) {
        router.push('/client-portal')
      } else if (roleData.isAgent) {
        router.push('/agent-portal')
      } else if (roleData.isAdmin) {
        router.push('/admin-portal')
      } else {
        console.error('Unknown role:', roleData)
        await supabase.auth.signOut()
        router.push('/auth/login?error=unauthorized')
      }
    } catch (error) {
      console.error('Error checking role:', error)
      await supabase.auth.signOut()
      router.push('/auth/login?error=role-check-failed')
    }
  }

  useEffect(() => {
    // Check active sessions and set up auth state listener
    const initAuth = async () => {
      try {
        // Get initial session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError
        
        setUser(session?.user ?? null)
        if (session?.user) {
          redirectBasedOnRole(session.access_token)
        }
        
        // Set up auth state change listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log('Auth state changed:', event, session?.user)
            setUser(session?.user ?? null)
            
            if (event === 'SIGNED_IN' && session?.user) {
              redirectBasedOnRole(session.access_token)
            } else if (event === 'SIGNED_OUT') {
              router.push('/auth/login')
            }
          }
        )

        return () => {
          subscription.unsubscribe()
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    initAuth()
  }, [supabase.auth, router])

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      setUser(null)
      router.push('/auth/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
} 