import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { hasRequiredRole } from 'shared/src/auth/utils'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Auth error:', error.message)
      return NextResponse.redirect(new URL('/auth/login', requestUrl.origin))
    }

    // Check if user has the required role
    const userRole = session?.user?.app_metadata?.user_role
    if (!userRole || userRole !== 'admin') {
      return NextResponse.redirect(new URL('/unauthorized', requestUrl.origin))
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(new URL('/admin-portal', requestUrl.origin))
} 