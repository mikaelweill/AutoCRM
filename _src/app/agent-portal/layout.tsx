'use client'

import { Navigation } from "@/components/Navigation"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { createClient } from '@/lib/supabase'

const agentNavLinks = [
  { href: '/agent-portal', label: 'Dashboard' },
  { href: '/agent-portal/queue', label: 'Ticket Queue' },
  { href: '/agent-portal/my-tickets', label: 'My Tickets' },
  { href: '/agent-portal/all-tickets', label: 'All Tickets' },
  { href: '/agent-portal/create', label: 'Create Agent' }
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
        
        if (!data.isAgent) {
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
  }, [user, loading, router, supabase.functions])

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