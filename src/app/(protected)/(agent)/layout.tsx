'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navigation } from "@/components/Navigation"
import { useAuth } from "@/contexts/AuthContext"
import { createClient } from '@/lib/supabase'

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
  const router = useRouter()
  const [isCheckingRole, setIsCheckingRole] = useState(true)

  useEffect(() => {
    async function checkRole() {
      if (!user) return

      try {
        const supabase = createClient()
        const { data: session } = await supabase.auth.getSession()
        const response = await fetch('/functions/v1/check-role', {
          headers: {
            Authorization: `Bearer ${session.session?.access_token}`
          }
        })

        if (!response.ok) {
          throw new Error('Failed to check role')
        }

        const { role } = await response.json()
        if (role !== 'agent') {
          router.push('/unauthorized')
        }
      } catch (error) {
        console.error('Error checking role:', error)
        router.push('/unauthorized')
      } finally {
        setIsCheckingRole(false)
      }
    }

    if (!loading) {
      checkRole()
    }
  }, [user, loading, router])

  if (loading || isCheckingRole) {
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