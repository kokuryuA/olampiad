import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Allow access to reset-password and update-password pages regardless of auth status
  if (req.nextUrl.pathname === '/reset-password' || req.nextUrl.pathname === '/update-password') {
    return res
  }

  // Protected routes that require authentication
  const protectedRoutes = [
    '/create-announcement',
    '/my-announcements',
    '/dashboard',
    '/home'
  ]

  // If user is not signed in and trying to access protected route, redirect to login
  if (!session && protectedRoutes.includes(req.nextUrl.pathname)) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // If user is signed in and trying to access auth pages, redirect to dashboard
  if (session && (req.nextUrl.pathname === '/login' || req.nextUrl.pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // If user is signed in and accessing root, redirect to dashboard
  if (session && req.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return res
}

export const config = {
  matcher: ['/', '/login', '/signup', '/home', '/reset-password', '/update-password', '/create-announcement', '/my-announcements', '/dashboard', '/announcements']
} 