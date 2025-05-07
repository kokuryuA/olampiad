'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'
import Image from 'next/image'

interface WishlistItem {
  id: string
  announcement: {
    id: string
    title: string
    description: string
    price: number
    image_url: string | null
    created_at: string
  }
}

export default function Wishlist() {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchWishlist()
  }, [])

  const fetchWishlist = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('You must be logged in to view your wishlist')
        return
      }

      const { data, error } = await supabase
        .from('wishlist')
        .select(`
          id,
          announcement:announcements!inner (
            id,
            title,
            description,
            price,
            image_url,
            created_at
          )
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setWishlist(data || [])
    } catch (err: any) {
      console.error('Error fetching wishlist:', err)
      setError(err.message || 'Failed to load wishlist')
    } finally {
      setLoading(false)
    }
  }

  const removeFromWishlist = async (wishlistId: string) => {
    try {
      const { error } = await supabase
        .from('wishlist')
        .delete()
        .eq('id', wishlistId)

      if (error) throw error
      setWishlist(prev => prev.filter(item => item.id !== wishlistId))
    } catch (err: any) {
      console.error('Error removing from wishlist:', err)
      setError(err.message || 'Failed to remove item from wishlist')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-700">{error}</p>
      </div>
    )
  }

  if (wishlist.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-700">Your wishlist is empty</p>
        <Link 
          href="/home" 
          className="mt-4 inline-block text-indigo-700 hover:text-indigo-800"
        >
          Browse announcements
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {wishlist.map((item) => (
        <div key={item.id} className="bg-white rounded-lg shadow-md overflow-hidden">
          <Link href={`/announcements/${item.announcement.id}`}>
            <div className="relative h-48 w-full">
              {item.announcement.image_url ? (
                <Image
                  src={item.announcement.image_url}
                  alt={item.announcement.title}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-700">No image</span>
                </div>
              )}
            </div>
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {item.announcement.title}
              </h3>
              <p className="text-gray-700 text-sm mb-2 line-clamp-2">
                {item.announcement.description}
              </p>
              <p className="text-indigo-700 font-semibold">
                ${item.announcement.price.toFixed(2)}
              </p>
            </div>
          </Link>
          <div className="p-4 border-t border-gray-100">
            <button
              onClick={() => removeFromWishlist(item.id)}
              className="w-full text-center px-4 py-2 text-sm font-medium text-red-700 hover:text-red-800 transition-colors"
            >
              Remove from wishlist
            </button>
          </div>
        </div>
      ))}
    </div>
  )
} 