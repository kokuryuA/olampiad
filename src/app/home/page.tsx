'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'
import AnnouncementCard from '@/components/AnnouncementCard'
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

export default function HomePage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const supabase = createClientComponentClient()

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          setCurrentUserId(session.user.id)
        }

        const { data, error } = await supabase
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error
        setAnnouncements(data || [])
      } catch (err) {
        console.error('Error fetching announcements:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAnnouncements()
  }, [supabase])

  const filteredAnnouncements = useMemo(() => {
    return announcements.filter(announcement => {
      const matchesSearch = searchQuery.trim() === '' ||
        announcement.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        announcement.description.toLowerCase().includes(searchQuery.toLowerCase())
      
      const minPriceNum = parseFloat(minPrice) || 0
      const maxPriceNum = parseFloat(maxPrice) || Infinity
      const matchesPrice = announcement.price >= minPriceNum && announcement.price <= maxPriceNum

      return matchesSearch && matchesPrice
    })
  }, [searchQuery, minPrice, maxPrice, announcements])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <NavigationBar />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <div className="bg-indigo-600">
          <div className="max-w-7xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
                Welcome to MarketPlace
              </h1>
              <p className="mt-6 max-w-2xl mx-auto text-xl text-indigo-100">
                Buy and sell items in your community. Start selling today!
              </p>
              <div className="mt-10">
                <Link
                  href="/create-announcement"
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-indigo-50"
                >
                  Start Selling
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-8 mt-8">
          <div className="max-w-3xl mx-auto">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                  placeholder="Search announcements..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-4">
                <input
                  type="number"
                  className="w-32 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                  placeholder="Min price"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  min="0"
                  step="0.01"
                />
                <input
                  type="number"
                  className="w-32 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                  placeholder="Max price"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : filteredAnnouncements.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900">
                {searchQuery || minPrice || maxPrice ? 'No matching announcements found' : 'No Announcements Yet'}
              </h3>
              <p className="mt-2 text-sm text-gray-700">
                {searchQuery || minPrice || maxPrice ? 'Try a different search term' : 'Be the first to create an announcement!'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredAnnouncements.map((announcement) => (
                <AnnouncementCard 
                  key={announcement.id} 
                  announcement={announcement}
                  isOwner={announcement.user_id === currentUserId}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-700">
              © 2024 MarketPlace. All rights reserved.
            </p>
            <div className="flex space-x-4">
              <Link href="/about" className="text-sm text-gray-700 hover:text-indigo-600">
                About
              </Link>
              <Link href="/contact" className="text-sm text-gray-700 hover:text-indigo-600">
                Contact
              </Link>
              <Link href="/privacy" className="text-sm text-gray-700 hover:text-indigo-600">
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
} 