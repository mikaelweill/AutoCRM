'use client'

import { Navigation } from "@/components/Navigation"
import { useAuth } from "@/contexts/AuthContext"

const agentNavLinks = [
  { href: '/agent', label: 'Dashboard' },
  { href: '/agent/queue', label: 'Ticket Queue' },
  { href: '/agent/my-tickets', label: 'My Tickets' },
  { href: '/agent/all-tickets', label: 'All Tickets' },
  { href: '/agent/create', label: 'Create Agent' }
]

export default function AgentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!user) {
    return null // Will be handled by ProtectedLayout
  }

  return (
    <div className="h-screen flex">
      <Navigation links={agentNavLinks} title="Agent Portal" />
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
} 