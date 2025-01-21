'use client'

import { AgentDashboard } from './components/AgentDashboard'

export default function AgentPortalPage() {
  return (
    <div className="h-full overflow-auto p-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-8">Agent Dashboard</h1>
      <AgentDashboard />
    </div>
  )
}