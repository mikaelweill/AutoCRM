'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import { hasRequiredRole } from '../auth/utils'
import { AuthUser } from '../auth/types'

type AuthContextType = {
  user: AuthUser | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
})

type AppType = 'client' | 'agent' | 'admin'

interface AuthProviderProps {
  children: React.ReactNode
  appType: AppType
}

export function AuthProvider({ children, appType }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  const redirectBasedOnRole = (user: AuthUser) => {
    try {
      if (!hasRequiredRole(user, appType)) {
        console.error('User does not have required role:', appType)
        supabase.auth.signOut()
        router.push('/auth/login?error=unauthorized')
        return
      }

      // Redirect based on app type
      switch (appType) {
        case 'client':
          router.push('/client-portal')
          break
        case 'agent':
          router.push('/agent-portal')
          break
        case 'admin':
          router.push('/admin-portal')
          break
      }
    } catch (error) {
      console.error('Error checking role:', error)
      router.push('/auth/login?error=role-check-failed')
    }
  }

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError
        
        if (session?.access_token) {
          console.log('JWT Claims:', JSON.parse(atob(session.access_token.split('.')[1])))
        }
        
        const authUser = session?.user as AuthUser | null
        setUser(authUser)
        if (authUser) {
          redirectBasedOnRole(authUser)
        }
        
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log('Auth state changed:', event, session?.user)
            const authUser = session?.user as AuthUser | null
            setUser(authUser)
            
            if (event === 'SIGNED_IN' && authUser) {
              redirectBasedOnRole(authUser)
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
  }, [supabase.auth, router, appType])

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