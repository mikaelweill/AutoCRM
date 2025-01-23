import { AuthForm } from 'shared'
import { ThemeSupa } from '@supabase/auth-ui-shared'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-sm">
        <AuthForm
          title="Welcome to Help Desk - Agent Portal"
          redirectTo="/agent-portal"
          requireToken={true}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#4f46e5',  // Indigo color for agent portal
                  brandAccent: '#4338ca'
                }
              }
            }
          }}
        />
      </div>
    </div>
  )
} 