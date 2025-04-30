'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClientComponentClient()

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      })

      if (error) throw error

      setMessage('Check your email for the password reset link!')
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('An error occurred while sending reset password email')
      }
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-8">
          Reset your password
        </h1>

        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}
          {message && (
            <div className="text-green-500 text-sm text-center">{message}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full p-3 bg-[#6366F1] hover:bg-[#4F46E5] text-white rounded-lg font-medium"
          >
            {loading ? 'Sending reset link...' : 'Send reset link'}
          </button>

          <div className="text-center">
            <Link
              href="/login"
              className="text-sm text-[#6366F1] hover:text-[#4F46E5]"
            >
              Back to login
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
} 