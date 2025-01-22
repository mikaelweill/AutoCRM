import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { AuthUser } from 'shared/src/auth/types'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  
  try {
    const code = requestUrl.searchParams.get('code')
    console.log('Auth callback received with code:', code)

    if (code) {
      const supabase = createRouteHandlerClient({ cookies })
      const { data: { session }, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (sessionError) {
        console.error('Error exchanging code for session:', sessionError)
        return NextResponse.redirect(new URL('/auth/login?error=auth', requestUrl.origin))
      }

      if (!session) {
        console.error('No session established')
        return NextResponse.redirect(new URL('/auth/login?error=no_session', requestUrl.origin))
      }

      // Get user role from JWT claims
      const user = session.user as AuthUser
      const userRole = user.user_role // using root level for convenience

      console.log('User role from JWT:', userRole)

      if (userRole !== 'client') {
        console.error('User is not a client:', userRole)
        await supabase.auth.signOut()
        return NextResponse.redirect(new URL('/auth/login?error=unauthorized', requestUrl.origin))
      }

      return NextResponse.redirect(new URL('/client-portal', requestUrl.origin))
    }

    console.error('No code received in callback')
    return NextResponse.redirect(new URL('/auth/login?error=no_code', requestUrl.origin))
  } catch (error) {
    console.error('Callback error:', error)
    return NextResponse.redirect(new URL('/auth/login?error=unknown', requestUrl.origin))
  }
} 