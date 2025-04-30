'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import NavigationBar from '@/components/NavigationBar'
import Wishlist from '@/components/Wishlist'

interface Announcement {
  id: string
  title: string
  description: string
  price: number
  image_url: string | null
  created_at: string
  user_id: string
}

interface Stats {
  totalItems: number
  totalViews: number
  totalSales: number
  averagePrice: number
}

export default function DashboardPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [stats, setStats] = useState<Stats>({
    totalItems: 0,
    totalViews: 0,
    totalSales: 0,
    averagePrice: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        router.push('/login')
        return
      }

      // Fetch user's announcements
      const { data: announcementsData, error: announcementsError } = await supabase
        .from('announcements')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      if (announcementsError) throw announcementsError

      setAnnouncements(announcementsData || [])

      // Calculate stats
      const totalItems = announcementsData?.length || 0
      const totalPrice = announcementsData?.reduce((sum, item) => sum + item.price, 0) || 0
      const averagePrice = totalItems > 0 ? totalPrice / totalItems : 0

      setStats({
        totalItems,
        totalViews: 0, // You'll need to implement view tracking
        totalSales: 0, // You'll need to implement sales tracking
        averagePrice
      })
    } catch (err: unknown) {
      console.error('Error fetching dashboard data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavigationBar />
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationBar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-700">Manage your announcements and wishlist</p>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Items</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{stats.totalItems}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Views</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{stats.totalViews}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Sales</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{stats.totalSales}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Average Price</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">
              ${stats.averagePrice.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* My Announcements */}
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">My Announcements</h2>
              <Link
                href="/announcements/new"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-700 hover:bg-indigo-800"
              >
                Create New
              </Link>
            </div>

            {error ? (
              <div className="text-red-700">{error}</div>
            ) : announcements.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-700">You haven&apos;t created any announcements yet</p>
                <Link
                  href="/announcements/new"
                  className="mt-4 inline-block text-indigo-700 hover:text-indigo-800"
                >
                  Create your first announcement
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {announcements.map((announcement) => (
                  <div key={announcement.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="relative h-48 w-full">
                      {announcement.image_url ? (
                        <img
                          src={announcement.image_url}
                          alt={announcement.title}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-700">No image</span>
                        </div>
                      )}
                    </div>
                    <div className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {announcement.title}
                      </h3>
                      <p className="text-gray-700 text-sm mb-4 line-clamp-2">
                        {announcement.description}
                      </p>
                      <div className="flex justify-between items-center">
                        <span className="text-indigo-700 font-semibold">
                          ${announcement.price.toFixed(2)}
                        </span>
                        <div className="flex space-x-2">
                          <Link
                            href={`/announcements/edit/${announcement.id}`}
                            className="text-indigo-700 hover:text-indigo-800"
                          >
                            Edit
                          </Link>
                          <Link
                            href={`/announcements/${announcement.id}`}
                            className="text-indigo-700 hover:text-indigo-800"
                          >
                            View
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Wishlist */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">My Wishlist</h2>
            <Wishlist />
          </div>
        </div>
      </main>
    </div>
  )
} 