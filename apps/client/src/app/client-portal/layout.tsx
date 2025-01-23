'use client'

import { Navigation } from "shared/src/components/Navigation"
import { useAuth } from "shared/src/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect, useRef } from "react"
import { hasRequiredRole } from "shared/src/auth/utils"

const clientNavLinks = [
  { href: '/client-portal', label: 'Dashboard' },
  { href: '/client-portal/my-tickets', label: 'My Tickets (Old)' },
  { href: '/client-portal/my-new-tickets', label: 'My Tickets (New)' },
  { href: '/client-portal/knowledge-base', label: 'Knowledge Base' }
]

export default function ClientLayout({
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

    const isAuthorized = Boolean(user && hasRequiredRole(user, 'client'))
    
    // Only redirect if auth status actually changed
    if (!isAuthorized && wasAuthorized.current) {
      router.replace(!user ? '/auth/login' : '/unauthorized')
    }

    wasAuthorized.current = isAuthorized
  }, [user, loading, router])

  // Only block initial render if never authorized
  if (!wasAuthorized.current && (loading || !user || !hasRequiredRole(user, 'client'))) {
    return null
  }

  return (
    <div className="h-screen flex">
      <Navigation links={clientNavLinks} title="Client Portal" />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
} 