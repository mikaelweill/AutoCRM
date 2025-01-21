'use client'

import { useAuth } from "@/contexts/AuthContext"
import { useRouter, usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { createClient } from '@/lib/supabase'

type UserRole = 'client' | 'agent' | null

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [userRole, setUserRole] = useState<UserRole>(null)
  const [isChecking, setIsChecking] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace('/auth/login')
      return
    }

    const checkRole = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('check-role')
        
        if (error) throw error
        
        // Set the user's role
        if (data.isClient) setUserRole('client')
        else if (data.isAgent) setUserRole('agent')
        else throw new Error('Invalid role')

        // Check if user is trying to access the wrong section
        const isInAgentSection = pathname.startsWith('/agent')
        const isInClientSection = pathname.startsWith('/client')

        if (isInAgentSection && !data.isAgent) {
          router.replace('/unauthorized')
        } else if (isInClientSection && !data.isClient) {
          router.replace('/unauthorized')
        }
      } catch (error) {
        console.error('Error checking role:', error)
        router.replace('/unauthorized')
      } finally {
        setIsChecking(false)
      }
    }

    checkRole()
  }, [user, loading, router, pathname, supabase.functions])

  // Show nothing while checking
  if (loading || isChecking) {
    return null
  }

  // Show nothing if no role (will be redirected)
  if (!userRole) {
    return null
  }

  return children
} 