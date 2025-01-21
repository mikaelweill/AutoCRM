'use client'

import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { createClient } from '@/lib/supabase'

export default function Login() {
  const supabase = createClient()

  return (
    <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-sm">
      <h1 className="text-2xl font-semibold mb-6 text-center">Welcome to Help Desk</h1>
      <Auth
        supabaseClient={supabase}
        appearance={{ 
          theme: ThemeSupa,
          variables: {
            default: {
              colors: {
                brand: '#404040',
                brandAccent: '#2d2d2d'
              }
            }
          }
        }}
        providers={['google', 'github']}
        redirectTo={`${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`}
      />
    </div>
  )
} 