'use client'

import { AuthForm } from 'shared'
import { ThemeSupa } from '@supabase/auth-ui-shared'

export default function ClientLogin() {
  return (
    <AuthForm
      title="Client Portal"
      description="Sign in to access your client dashboard"
      appearance={{
        theme: ThemeSupa,
        variables: {
          default: {
            colors: {
              brand: '#0F172A',
              brandAccent: '#2563EB'
            }
          }
        }
      }}
      redirectTo="/client/auth/callback"
    />
  )
} 