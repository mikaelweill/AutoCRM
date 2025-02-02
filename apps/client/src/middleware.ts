import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Refresh session if expired
  const { data: { session } } = await supabase.auth.getSession()

  // Auth pages are accessible without session
  if (req.nextUrl.pathname.startsWith('/auth/login') || req.nextUrl.pathname.startsWith('/client/auth')) {
    if (session) {
      // If user is signed in, redirect to client portal
      return NextResponse.redirect(new URL('/client-portal', req.url))
    }
    // Allow access to auth pages
    return res
  }

  // Protected routes
  if (!session) {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  return res
}

// Protect all routes except auth and static files
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}