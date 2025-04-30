'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import NavigationBar from '@/components/NavigationBar'

interface Announcement {
  id: string
  title: string
  description: string
  price: number
  image_url: string | null
  created_at: string
  user_id: string
}

export default function AnnouncementDetails() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const router = useRouter()
  const params = useParams()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setCurrentUserId(session.user.id)
        }

        const { data, error } = await supabase
          .from('announcements')
          .select('*')
          .eq('id', params.id)
          .single()

        if (error) throw error
        if (!data) {
          setError('Announcement not found')
          return
        }

        setAnnouncement(data)
      } catch (error) {
        console.error('Error fetching announcement:', error)
        setError('Failed to load announcement')
      } finally {
        setLoading(false)
      }
    }

    fetchAnnouncement()
  }, [params.id, supabase])

  const handleEdit = () => {
    if (announcement) {
      router.push(`/announcements/edit/${announcement.id}`)
    }
  }

  const handleDelete = async () => {
    if (!announcement) return

    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', announcement.id)

      if (error) throw error

      router.push('/home')
      router.refresh()
    } catch (error) {
      console.error('Error deleting announcement:', error)
      setError('Failed to delete announcement')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <NavigationBar />
        <div className="flex-grow flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <NavigationBar />
        <div className="flex-grow flex items-center justify-center">
          <div className="max-w-md w-full space-y-4 text-center">
            <h2 className="text-2xl font-bold text-gray-900">Error</h2>
            <p className="text-gray-600">{error}</p>
            <Link
              href="/home"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!announcement) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <NavigationBar />
      <main className="flex-grow py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
              <div className="relative aspect-square max-h-[500px]">
                {announcement.image_url ? (
                  <Image
                    src={announcement.image_url}
                    alt={announcement.title}
                    fill
                    className="object-contain rounded-lg"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center">
                    <span className="text-gray-400">No image available</span>
                  </div>
                )}
              </div>
              <div className="space-y-6">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{announcement.title}</h1>
                  <p className="mt-2 text-2xl font-semibold text-indigo-600">
                    ${announcement.price.toFixed(2)}
                  </p>
                </div>
                <div className="prose max-w-none">
                  <p className="text-gray-600">{announcement.description}</p>
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <span>Posted by {currentUserId === announcement.user_id ? 'You' : 'Anonymous'}</span>
                  <span className="mx-2">•</span>
                  <span>
                    {new Date(announcement.created_at).toLocaleDateString()}
                  </span>
                </div>
                {currentUserId === announcement.user_id && (
                  <div className="flex space-x-4">
                    <button
                      onClick={handleEdit}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-indigo-50 hover:bg-indigo-100"
                    >
                      Edit
                    </button>
                    <button
                      onClick={handleDelete}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">
              © 2024 MarketPlace. All rights reserved.
            </p>
            <div className="flex space-x-4">
              <Link href="/about" className="text-sm text-gray-500 hover:text-indigo-600">
                About
              </Link>
              <Link href="/contact" className="text-sm text-gray-500 hover:text-indigo-600">
                Contact
              </Link>
              <Link href="/privacy" className="text-sm text-gray-500 hover:text-indigo-600">
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
} 