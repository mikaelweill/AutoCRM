'use client'

import { Navigation } from "@/components/Navigation"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { createClient } from '@/lib/supabase'

const clientNavLinks = [
  { href: '/client-portal', label: 'Dashboard' },
  { href: '/client-portal/tickets', label: 'My Tickets' },
  { href: '/client-portal/knowledge-base', label: 'Knowledge Base' },
  { href: '/client-portal/reports', label: 'Reports' }
]

export default function ClientLayout({
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
        
        if (!data.isClient) {
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
      <Navigation links={clientNavLinks} title="Client Portal" />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
} 