import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  console.log('Callback route hit:', request.url)
  const requestUrl = new URL(request.url)
  
  try {
    const code = requestUrl.searchParams.get('code')
    const next = requestUrl.searchParams.get('next')
    console.log('Client portal callback received with code:', code)
    console.log('Next URL:', next)

    if (code) {
      const supabase = createRouteHandlerClient({ cookies })
      console.log('Exchanging code for session...')
      const { data: { session }, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (sessionError) {
        console.error('Error exchanging code for session:', sessionError)
        return NextResponse.redirect(new URL('/login?error=auth', requestUrl.origin))
      }

      if (!session) {
        console.error('No session established')
        return NextResponse.redirect(new URL('/login?error=no_session', requestUrl.origin))
      }

      console.log('Session established, checking role...')
      
      // Check user role using edge function
      const roleResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/check-role`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        },
      })

      console.log('Role check response status:', roleResponse.status)
      const responseText = await roleResponse.text()
      console.log('Role check response text:', responseText)

      if (!roleResponse.ok) {
        console.error('Edge function error:', responseText)
        console.error('Role check status:', roleResponse.status)
        await supabase.auth.signOut()
        return NextResponse.redirect(new URL('/login?error=role', requestUrl.origin))
      }

      let roleData;
      try {
        roleData = JSON.parse(responseText)
      } catch (e) {
        console.error('Error parsing role response:', e)
        await supabase.auth.signOut()
        return NextResponse.redirect(new URL('/login?error=role_parse', requestUrl.origin))
      }

      console.log('Role data:', roleData)
      
      if (!roleData.isClient) {
        console.error('User is not a client:', roleData)
        await supabase.auth.signOut()
        return NextResponse.redirect(new URL('/login?error=unauthorized', requestUrl.origin))
      }

      // Create a response with the redirect
      const response = NextResponse.redirect(new URL('/client-portal', requestUrl.origin))

      // Set the auth cookie
      const { data: { session: newSession }, error: refreshError } = await supabase.auth.getSession()
      if (refreshError) {
        console.error('Error refreshing session:', refreshError)
        return NextResponse.redirect(new URL('/login?error=session', requestUrl.origin))
      }

      console.log('Session established and role verified, redirecting to client portal')
      return response
    }

    console.error('No code received in callback')
    return NextResponse.redirect(new URL('/login?error=no_code', requestUrl.origin))
  } catch (error) {
    console.error('Callback error:', error)
    return NextResponse.redirect(new URL('/login?error=unknown', requestUrl.origin))
  }
} 