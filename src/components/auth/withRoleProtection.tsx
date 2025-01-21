'use client'

import { useAuth } from "@/contexts/AuthContext"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"

export function withRoleProtection(WrappedComponent: React.ComponentType, requiredRole: 'client' | 'agent' | 'admin') {
  return function ProtectedRoute(props: any) {
    const { user, loading: authLoading } = useAuth()
    const [verified, setVerified] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
      async function verifyRole() {
        if (!user) {
          router.replace('/auth/login')
          return
        }

        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (!session?.access_token) {
            router.replace('/auth/login')
            return
          }

          const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/check-role`, {
            headers: {
              Authorization: `Bearer ${session.access_token}`
            }
          })

          if (!response.ok) {
            router.replace('/unauthorized')
            return
          }

          const { role } = await response.json()
          if (role !== requiredRole) {
            router.replace('/unauthorized')
            return
          }

          setVerified(true)
        } catch (error) {
          console.error('Error verifying role:', error)
          router.replace('/unauthorized')
        }
      }

      verifyRole()
    }, [user, router, supabase.auth])

    if (authLoading || !verified) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
        </div>
      )
    }

    return <WrappedComponent {...props} />
  }
} 