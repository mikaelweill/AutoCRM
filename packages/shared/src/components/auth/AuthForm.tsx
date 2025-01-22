'use client'

import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { createClient } from '../../lib/supabase'
import { useEffect, useState } from 'react'
import { AuthChangeEvent, Session } from '@supabase/supabase-js'

interface AuthFormProps {
  title?: string
  description?: string
  redirectTo?: string
  appearance?: {
    theme: typeof ThemeSupa
    variables?: {
      default: {
        colors: {
          brand: string
          brandAccent: string
        }
      }
    }
  }
}

export function AuthForm({ 
  title = 'Welcome back',
  description = 'Sign in to your account',
  redirectTo,
  appearance = {
    theme: ThemeSupa,
    variables: {
      default: {
        colors: {
          brand: '#0F172A',
          brandAccent: '#2563EB'
        }
      }
    }
  }
}: AuthFormProps) {
  const supabase = createClient()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Remove console logs in production
    if (process.env.NODE_ENV === 'production') return

    console.log('AuthForm mounted')
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log('Redirect URL:', redirectTo || `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`)
  }, [redirectTo])

  // Separate effect for auth state to prevent unnecessary re-subscriptions
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('Auth state changed:', event, session)
      }
      if (event === 'SIGNED_IN') {
        setError(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase.auth])

  return (
    <div className="flex min-h-screen flex-1 flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
          {title}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {description}
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        {error && (
          <div className="mb-4 p-4 text-sm text-red-700 bg-red-100 rounded-md">
            {error}
          </div>
        )}
        <Auth
          supabaseClient={supabase}
          appearance={appearance}
          providers={[]}
          redirectTo={redirectTo || `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`}
        />
      </div>
    </div>
  )
} 