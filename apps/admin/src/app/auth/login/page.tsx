import { AuthForm } from 'shared'
import { ThemeSupa } from '@supabase/auth-ui-shared'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-sm">
        <AuthForm
          title="Welcome to Help Desk - Admin Portal"
          redirectTo="/admin-portal"
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#dc2626',  // Red color for admin portal
                  brandAccent: '#b91c1c'
                }
              }
            }
          }}
        />
      </div>
    </div>
  )
} 