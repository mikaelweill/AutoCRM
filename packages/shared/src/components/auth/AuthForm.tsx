'use client'

import { createClient } from '../../lib/supabase'
import { signUpWithToken } from '../../../../../shared/src/lib/api'
import { useEffect, useState } from 'react'
import { AuthChangeEvent, Session } from '@supabase/supabase-js'

interface AuthFormProps {
  title?: string
  description?: string
  redirectTo?: string
  requireToken?: boolean
  appearance?: {
    theme: any
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

interface Invitation {
  id: string
  email: string
  token: string
  expires_at: string
  used_at: string | null
  created_at: string
}

export function AuthForm({ 
  title = 'Welcome back',
  description = 'Sign in to your account',
  redirectTo,
  requireToken = false,
  appearance
}: AuthFormProps) {
  const supabase = createClient()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState('')
  const [view, setView] = useState<'sign_in' | 'sign_up'>('sign_in')

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

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
    } catch (err) {
      console.error('Error during sign in:', err)
      setError(err instanceof Error ? err.message : 'An error occurred during sign in')
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (requireToken) {
        if (!token) {
          setError('Invitation token is required')
          return
        }

        // Use our new edge function for token signup
        const result = await signUpWithToken(email, password, token)
        
        if (result.error) {
          setError(result.error)
          return
        }

        setError(null)
        setSuccess('Sign up successful! Please check your email for confirmation.')
        
        // Reset form
        setEmail('')
        setPassword('')
        setToken('')
        
        // Switch to sign-in view after 3 seconds
        setTimeout(() => {
          setSuccess(null)
          setView('sign_in')
        }, 3000)

        return
      }

      // Regular signup (no token required)
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo || `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`
        }
      })

      if (signUpError) throw signUpError

      setError(null)
      setSuccess('Sign up successful! Please check your email for confirmation.')
      
      // Reset form
      setEmail('')
      setPassword('')
      
      // Switch to sign-in view after 3 seconds
      setTimeout(() => {
        setSuccess(null)
        setView('sign_in')
      }, 3000)

    } catch (err) {
      console.error('Error during signup:', err)
      setError(err instanceof Error ? err.message : 'An error occurred during signup')
    }
  }

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
        {success && (
          <div className="mb-4 p-4 text-sm text-green-700 bg-green-100 rounded-md">
            {success}
          </div>
        )}

        <form onSubmit={view === 'sign_in' ? handleSignIn : handleSignUp} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium leading-6 text-gray-900">
              Email address
            </label>
            <div className="mt-2">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-md border-0 px-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium leading-6 text-gray-900">
              Password
            </label>
            <div className="mt-2">
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-md border-0 px-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              />
            </div>
          </div>

          {view === 'sign_up' && requireToken && (
            <div>
              <label htmlFor="token" className="block text-sm font-medium leading-6 text-gray-900">
                Invitation Token
              </label>
              <div className="mt-2">
                <input
                  id="token"
                  name="token"
                  type="text"
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="block w-full rounded-md border-0 px-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                />
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              className="flex w-full justify-center rounded-md px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 transition-colors duration-200"
              style={{
                backgroundColor: appearance?.variables?.default.colors.brand,
              }}
            >
              {view === 'sign_in' ? 'Sign in' : 'Sign up'}
            </button>
          </div>
        </form>

        <p className="mt-10 text-center text-sm text-gray-500">
          {view === 'sign_in' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => setView(view === 'sign_in' ? 'sign_up' : 'sign_in')}
            className="font-semibold leading-6 transition-colors duration-200"
            style={{
              color: appearance?.variables?.default.colors.brand,
            }}
          >
            {view === 'sign_in' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
} 