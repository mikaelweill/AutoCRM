import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

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
        return NextResponse.redirect(new URL('/login?error=auth', requestUrl.origin))
      }

      if (!session) {
        console.error('No session established')
        return NextResponse.redirect(new URL('/login?error=no_session', requestUrl.origin))
      }

      // Check user role using edge function
      const roleResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/check-role`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      })

      if (!roleResponse.ok) {
        const errorText = await roleResponse.text()
        console.error('Edge function error:', errorText)
        return NextResponse.redirect(new URL('/login?error=role', requestUrl.origin))
      }
      
      const { role } = await roleResponse.json()
      console.log('Edge Function returned role:', role)

      if (role !== 'client') {
        console.error('User is not a client:', role)
        await supabase.auth.signOut()
        return NextResponse.redirect(new URL('/login?error=unauthorized', requestUrl.origin))
      }

      return NextResponse.redirect(new URL('/client-portal', requestUrl.origin))
    }

    console.error('No code received in callback')
    return NextResponse.redirect(new URL('/login?error=no_code', requestUrl.origin))
  } catch (error) {
    console.error('Callback error:', error)
    return NextResponse.redirect(new URL('/login?error=unknown', requestUrl.origin))
  }
} 