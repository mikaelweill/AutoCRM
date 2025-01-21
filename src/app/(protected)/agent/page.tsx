'use client'

import { useAuth } from "@/contexts/AuthContext"

export default function AgentDashboardPage() {
  const { user } = useAuth()
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold mb-6">Agent Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Quick stats */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">Unassigned Tickets</h3>
          <p className="text-2xl font-semibold mt-2">--</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">My Active Tickets</h3>
          <p className="text-2xl font-semibold mt-2">--</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">Urgent Tickets</h3>
          <p className="text-2xl font-semibold mt-2">--</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">Resolved Today</h3>
          <p className="text-2xl font-semibold mt-2">--</p>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <p className="text-gray-500">No recent activity</p>
        </div>
      </div>
    </div>
  )
} 