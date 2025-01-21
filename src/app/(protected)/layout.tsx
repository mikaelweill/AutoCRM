'use client'

import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { createClient } from '@/lib/supabase'

export default function ProtectedLayout({
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
      router.push('/auth/login')
      return
    }

    const checkRole = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('check-role')
        
        if (error) throw error
        
        console.log('Role check response:', data)
        
        // For now, just authorize if we get a valid response
        setIsAuthorized(true)
      } catch (err) {
        console.error('Error checking role:', err)
        router.push('/auth/login')
      } finally {
        setIsChecking(false)
      }
    }

    checkRole()
  }, [user, loading, router, supabase.functions])

  if (loading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!isAuthorized) {
    return null // Will be redirected by useEffect
  }

  return children
} 