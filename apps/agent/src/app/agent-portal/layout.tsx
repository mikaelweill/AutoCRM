'use client'

import { Navigation } from "shared/src/components/Navigation"
import { useAuth } from "shared/src/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect, useRef } from "react"
import { hasRequiredRole } from "shared/src/auth/utils"
import { ChatWindow } from "shared"

const agentNavLinks = [
  { href: '/agent-portal', label: 'Dashboard' },
  { href: '/agent-portal/ticket-queue', label: 'Ticket Queue' },
  { href: '/agent-portal/my-tickets', label: 'My Tickets' }
]

export default function AgentLayout({
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

    const isAuthorized = Boolean(user && hasRequiredRole(user, 'agent'))
    
    // Only redirect if auth status actually changed
    if (!isAuthorized && wasAuthorized.current) {
      router.replace(!user ? '/auth/login' : '/unauthorized')
    }

    wasAuthorized.current = isAuthorized
  }, [user, loading, router])

  // Only block initial render if never authorized
  if (!wasAuthorized.current && (loading || !user || !hasRequiredRole(user, 'agent'))) {
    return null
  }

  return (
    <div className="h-screen flex">
      <Navigation links={agentNavLinks} title="Agent Portal" />
      <main className="flex-1 overflow-auto">
        {children}
        <ChatWindow />
      </main>
    </div>
  )
} 