'use client'

import { Navigation } from "shared/src/components/Navigation"
import { useAuth } from "shared/src/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

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
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace('/auth/login')
      return
    }

    const checkRole = () => {
      try {
        const role = user.app_metadata?.role
        
        if (role !== 'agent') {
          router.replace('/unauthorized')
          return
        }

        setIsAuthorized(true)
      } catch (error) {
        console.error('Error checking role:', error)
        router.replace('/unauthorized')
      } finally {
        setIsChecking(false)
      }
    }

    checkRole()
  }, [user, loading, router])

  // Show nothing while checking
  if (loading || isChecking) {
    return null
  }

  // Show nothing if not authorized
  if (!isAuthorized) {
    return null
  }

  return (
    <div className="h-screen flex">
      <Navigation links={agentNavLinks} title="Agent Portal" />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
} 