import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/update-password'
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  console.log('Auth callback received:', { code, next, error, errorDescription })

  if (error) {
    console.error('Auth callback error:', { error, errorDescription })
    return NextResponse.redirect(
      new URL(`/update-password?error=${error}&error_description=${errorDescription}`, requestUrl.origin)
    )
  }

  if (code) {
    try {
      const cookieStore = cookies()
      const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
      
      console.log('Exchanging code for session...')
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (exchangeError) {
        console.error('Error exchanging code for session:', exchangeError)
        return NextResponse.redirect(
          new URL(`/update-password?error=exchange_error&error_description=${exchangeError.message}`, requestUrl.origin)
        )
      }

      console.log('Successfully exchanged code for session, redirecting to:', next)
      return NextResponse.redirect(new URL(next, requestUrl.origin))
    } catch (error) {
      console.error('Unexpected error in auth callback:', error)
      return NextResponse.redirect(
        new URL('/update-password?error=unexpected_error&error_description=An unexpected error occurred', requestUrl.origin)
      )
    }
  }

  console.log('No code provided, redirecting to login')
  return NextResponse.redirect(new URL('/login', requestUrl.origin))
} 