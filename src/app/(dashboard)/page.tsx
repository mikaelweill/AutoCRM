'use client'

import { useAuth } from "@/contexts/AuthContext"

export default function Home() {
  const { user } = useAuth()

  return (
    <>
      <header className="mb-8">
        <h2 className="text-2xl font-semibold">Welcome back, {user?.email}</h2>
        <p className="text-gray-600">Here's what's happening today</p>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="p-6 bg-white rounded-lg shadow-sm border">
          <h3 className="text-gray-500 mb-2">Open Tickets</h3>
          <p className="text-3xl font-semibold">0</p>
        </div>
        <div className="p-6 bg-white rounded-lg shadow-sm border">
          <h3 className="text-gray-500 mb-2">Resolved Today</h3>
          <p className="text-3xl font-semibold">0</p>
        </div>
        <div className="p-6 bg-white rounded-lg shadow-sm border">
          <h3 className="text-gray-500 mb-2">Response Time</h3>
          <p className="text-3xl font-semibold">-</p>
        </div>
      </div>

      {/* Recent Tickets Placeholder */}
      <section>
        <h3 className="text-xl font-semibold mb-4">Recent Tickets</h3>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <p className="text-gray-500 text-center py-8">No tickets yet</p>
        </div>
      </section>
    </>
  )
} 