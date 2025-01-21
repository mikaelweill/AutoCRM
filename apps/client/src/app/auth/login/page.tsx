import { AuthForm } from 'shared'
import { ThemeSupa } from '@supabase/auth-ui-shared'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <AuthForm
          redirectTo="/client-portal"
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#2563eb',
                  brandAccent: '#1d4ed8'
                }
              }
            }
          }}
        />
      </div>
    </div>
  )
} 