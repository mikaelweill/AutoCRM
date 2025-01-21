'use client'

import { Navigation } from "@/components/Navigation"

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
  return (
    <div className="h-screen flex">
      <Navigation links={agentNavLinks} title="Agent Portal" />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
} 