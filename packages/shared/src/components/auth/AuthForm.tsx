'use client'

import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { createClient } from '../../lib/supabase'
import { useEffect } from 'react'
import { AuthChangeEvent, Session, Provider } from '@supabase/supabase-js'

interface AuthFormProps {
  title?: string
  description?: string
  redirectTo?: string
  providers?: Provider[]
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
  providers = [],
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

  useEffect(() => {
    console.log('AuthForm mounted')
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log('Redirect URL:', redirectTo || `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`)
    
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      console.log('Auth state changed:', event, session)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [redirectTo, supabase.auth])

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
        <Auth
          supabaseClient={supabase}
          appearance={appearance}
          providers={providers}
          redirectTo={redirectTo || `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`}
          localization={{
            variables: {
              sign_in: {
                email_label: 'Email address',
                password_label: 'Password',
                button_label: 'Sign in',
              },
            },
          }}
        />
      </div>
    </div>
  )
} 