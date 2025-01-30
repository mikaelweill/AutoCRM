'use client'

import { Navigation } from "shared/src/components/Navigation"
import { useAuth } from "shared/src/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect, useRef } from "react"
import { hasRequiredRole } from "shared/src/auth/utils"

const adminNavLinks = [
  { href: '/admin-portal', label: 'Dashboard' },
  { href: '/admin-portal/ticket-assignment', label: 'Ticket Assignment' },
  { href: '/admin-portal/users', label: 'User Management' },
  { href: '/admin-portal/analytics', label: 'Analytics' },
  { href: '/admin-portal/ai-analytics', label: 'AI Analytics' },
  { href: '/admin-portal/kb', label: 'Knowledge Base' }
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const wasAuthorized = useRef(false)

  useEffect(() => {
    // Skip during initial load or rehydration
    if (loading) return

    const isAuthorized = Boolean(user && hasRequiredRole(user, 'admin'))
    
    // Only redirect if auth status actually changed
    if (!isAuthorized && wasAuthorized.current) {
      router.replace(!user ? '/auth/login' : '/unauthorized')
    }

    wasAuthorized.current = isAuthorized
  }, [user, loading, router])

  // Only block initial render if never authorized
  if (!wasAuthorized.current && (loading || !user || !hasRequiredRole(user, 'admin'))) {
    return null
  }

  return (
    <div className="h-screen flex">
      <Navigation links={adminNavLinks} title="Admin Portal" />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
} 