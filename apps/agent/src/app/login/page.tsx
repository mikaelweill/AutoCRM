'use client'

import { AuthForm } from 'shared'
import { ThemeSupa } from '@supabase/auth-ui-shared'

export default function AgentLogin() {
  return (
    <AuthForm
      title="Agent Portal"
      description="Sign in to manage your support tickets"
      appearance={{
        theme: ThemeSupa,
        variables: {
          default: {
            colors: {
              brand: '#1E293B',
              brandAccent: '#3B82F6'
            }
          }
        }
      }}
      redirectTo="/agent-portal"
    />
  )
} 