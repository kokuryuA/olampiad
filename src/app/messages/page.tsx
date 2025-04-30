'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import NavigationBar from '@/components/NavigationBar'
import Messages from '@/components/Messages'

export default function MessagesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const announcementId = searchParams.get('announcement')

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationBar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
          <p className="mt-2 text-gray-700">Chat with buyers and sellers</p>
        </div>

        <Messages />
      </main>
    </div>
  )
} 