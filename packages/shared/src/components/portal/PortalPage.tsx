'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import { createClient } from '../../lib/supabase'

interface PortalPageProps {
  children?: React.ReactNode
  requiredRole: 'client' | 'agent' | 'admin'
  title?: string
}

export function PortalPage({ children, requiredRole, title }: PortalPageProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [roleVerified, setRoleVerified] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const verifyRole = async () => {
      if (!user) {
        console.log('No authenticated user found in portal, redirecting to login')
        router.push('/auth/login')
        return
      }

      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          console.log('No session found, redirecting to login')
          router.push('/auth/login')
          return
        }

        const response = await fetch('https://nkicqyftdkfphifgvejh.supabase.co/functions/v1/check-role', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
          }
        })

        if (!response.ok) {
          console.error('Failed to verify role')
          router.push('/auth/login')
          return
        }

        const roleData = await response.json()
        const hasRequiredRole = 
          (requiredRole === 'client' && roleData.isClient) ||
          (requiredRole === 'agent' && roleData.isAgent) ||
          (requiredRole === 'admin' && roleData.isAdmin)

        if (!hasRequiredRole) {
          console.error('User does not have required role:', requiredRole)
          router.push('/auth/login?error=unauthorized')
          return
        }

        setRoleVerified(true)
      } catch (error) {
        console.error('Error verifying role:', error)
        router.push('/auth/login?error=role-check-failed')
      }
    }

    if (!loading && user) {
      verifyRole()
    }
  }, [user, loading, router, requiredRole, supabase.auth])

  if (loading || (user && !roleVerified)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!user || !roleVerified) {
    return null
  }

  return (
    <div className="p-8">
      {title && <h1 className="text-2xl font-semibold mb-6">{title}</h1>}
      {children}
    </div>
  )
} 