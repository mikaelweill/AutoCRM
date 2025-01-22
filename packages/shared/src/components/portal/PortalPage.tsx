'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import { UserRole } from '../../auth/types'
import { hasRequiredRole } from '../../auth/utils'

interface PortalPageProps {
  children?: React.ReactNode
  requiredRole: UserRole
  title?: string
}

export function PortalPage({ children, requiredRole, title }: PortalPageProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [roleVerified, setRoleVerified] = useState(false)

  useEffect(() => {
    const verifyRole = () => {
      if (!user) {
        console.log('No authenticated user found in portal, redirecting to login')
        router.push('/auth/login')
        return
      }

      try {
        if (!hasRequiredRole(user, requiredRole)) {
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
  }, [user, loading, router, requiredRole])

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