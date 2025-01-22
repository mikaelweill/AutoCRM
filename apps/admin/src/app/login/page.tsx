'use client'

import { AuthForm } from 'shared'
import { ThemeSupa } from '@supabase/auth-ui-shared'

export default function AdminLogin() {
  return (
    <AuthForm
      title="Admin Portal"
      description="Sign in to access system administration"
      appearance={{
        theme: ThemeSupa,
        variables: {
          default: {
            colors: {
              brand: '#18181B',
              brandAccent: '#6366F1'
            }
          }
        }
      }}
      redirectTo="/admin-portal"
    />
  )
} 