'use client'

import { Navigation } from "shared/src/components/Navigation"
import { useAuth } from "shared/src/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { createClient } from 'shared/src/lib/supabase'

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

  return (
    <div className="h-screen flex">
      <Navigation links={agentNavLinks} title="Agent Portal" />
      <main className="flex-1 overflow-auto">
        {loading || isChecking ? (
          <div className="p-8 flex items-center justify-center">
            <div className="text-gray-500">Loading...</div>
          </div>
        ) : !isAuthorized ? (
          <div className="p-8 flex items-center justify-center">
            <div className="text-gray-500">Checking authorization...</div>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  )
} 