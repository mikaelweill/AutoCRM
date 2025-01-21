'use client'

import { PortalPage } from 'shared/src/components/portal/PortalPage'
import { useAuth } from 'shared/src/contexts/AuthContext'

export default function ClientPortal() {
  const { signOut } = useAuth()

  return (
    <PortalPage requiredRole="client">
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
        <nav className="bg-white shadow-lg border-b border-gray-200">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 justify-between items-center">
              <h2 className="text-2xl font-bold text-indigo-600 hover:text-indigo-500 transition-colors">
                AutoCRM
              </h2>
              <button
                onClick={signOut}
                className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </nav>
        <main className="py-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-lg shadow-xl p-6 mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Client Portal
              </h1>
              <p className="text-gray-500">Welcome to your dashboard</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Example Cards */}
              <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Recent Activity
                </h3>
                <p className="text-gray-600">
                  View your recent interactions and updates.
                </p>
              </div>
              
              <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Messages
                </h3>
                <p className="text-gray-600">
                  Check your latest messages and notifications.
                </p>
              </div>
              
              <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Settings
                </h3>
                <p className="text-gray-600">
                  Manage your account preferences and settings.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </PortalPage>
  )
} 