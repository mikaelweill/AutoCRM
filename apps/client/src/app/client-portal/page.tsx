'use client'

import { PortalPage } from 'shared/src/components/portal/PortalPage'
import { useAuth } from 'shared/src/contexts/AuthContext'

export default function ClientPortal() {
  const { signOut } = useAuth()

  return (
    <PortalPage requiredRole="client">
      <div className="min-h-screen bg-gray-100">
        <nav className="bg-white shadow-sm">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 justify-between items-center">
              <h2 className="text-2xl font-semibold text-gray-900">AutoCRM</h2>
              <button
                onClick={signOut}
                className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              >
                Sign Out
              </button>
            </div>
          </div>
        </nav>
        <main className="py-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-gray-900">
              Client Portal
            </h1>
            <div className="mt-6 bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-base font-semibold leading-6 text-gray-900">
                  Welcome to your client portal
                </h3>
                <div className="mt-2 max-w-xl text-sm text-gray-500">
                  <p>Your account is authenticated and role verified.</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </PortalPage>
  )
} 