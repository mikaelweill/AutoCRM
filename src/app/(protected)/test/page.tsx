'use client'

import { useAuth } from "@/contexts/AuthContext"

export default function TestPage() {
  const { user } = useAuth()
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Protected Test Page</h1>
      <p className="mb-2">If you can see this, you're authenticated!</p>
      <p className="text-gray-600">Logged in as: {user?.email}</p>
    </div>
  )
} 