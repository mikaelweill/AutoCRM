'use client'

import { Navigation } from "@/components/Navigation"
import { useAuth } from "@/contexts/AuthContext"

const clientNavLinks = [
  { href: '/', label: 'Tickets' },
  { href: '/knowledge-base', label: 'Knowledge Base' },
  { href: '/reports', label: 'Reports' },
]

export default function ClientLayout({
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
      <Navigation links={clientNavLinks} title="Client Portal" />
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
} 