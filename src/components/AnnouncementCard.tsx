'use client'

import Link from 'next/link'
import Image from 'next/image'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

interface Announcement {
  id: string
  title: string
  description: string
  price: number
  image_url: string | null
  created_at: string
  user_id: string
  category: string
}

interface AnnouncementCardProps {
  announcement: Announcement
  isOwner: boolean
  priority?: boolean
}

export default function AnnouncementCard({ announcement, isOwner, priority = false }: AnnouncementCardProps) {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [isInWishlist, setIsInWishlist] = useState(false)
  const [loading, setLoading] = useState(false)

  const checkWishlistStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data, error } = await supabase
        .from('wishlist')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('announcement_id', announcement.id)
        .maybeSingle()

      if (error) {
        console.error('Error checking wishlist status:', error)
        return
      }

      setIsInWishlist(!!data)
    } catch (error) {
      console.error('Error checking wishlist status:', error)
    }
  }

  useEffect(() => {
    checkWishlistStatus()
  }, [announcement.id])

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this item?')) return

    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', announcement.id)

      if (error) throw error
      router.refresh()
    } catch (error) {
      console.error('Error deleting announcement:', error)
    }
  }

  const toggleWishlist = async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      if (isInWishlist) {
        const { error } = await supabase
          .from('wishlist')
          .delete()
          .eq('user_id', session.user.id)
          .eq('announcement_id', announcement.id)

        if (error) throw error
        setIsInWishlist(false)
      } else {
        const { error } = await supabase
          .from('wishlist')
          .insert({
            user_id: session.user.id,
            announcement_id: announcement.id
          })

        if (error) throw error
        setIsInWishlist(true)
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMessage = () => {
    router.push(`/messages?announcement=${announcement.id}`)
  }

  return (
    <div 
      className="bg-white rounded-lg shadow-md overflow-hidden transition-transform duration-300 hover:shadow-lg hover:-translate-y-1"
    >
      <Link href={`/announcements/${announcement.id}`}>
        <div className="relative h-64 w-full">
          {announcement.image_url ? (
            <Image
              src={announcement.image_url}
              alt={announcement.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority={priority}
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
            {announcement.title}
          </h3>
          <p className="text-sm text-gray-500 mb-2">
            {announcement.category}
          </p>
          <p className="text-gray-700 text-sm mb-4 line-clamp-2">
            {announcement.description}
          </p>
          <div className="flex justify-between items-center">
            <span className="text-xl font-bold text-indigo-700">
              ${announcement.price.toFixed(2)}
            </span>
            <span className="text-sm text-gray-700">
              {new Date(announcement.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </Link>
      <div className="p-4 border-t border-gray-100">
        <div className="flex space-x-2">
          {!isOwner && (
            <>
              <button
                onClick={toggleWishlist}
                disabled={loading}
                className={`flex-1 text-center px-4 py-2 text-sm font-medium ${
                  isInWishlist 
                    ? 'text-red-700 hover:text-red-800' 
                    : 'text-indigo-700 hover:text-indigo-800'
                } transition-colors`}
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current mx-auto"></div>
                ) : isInWishlist ? (
                  'Remove from Wishlist'
                ) : (
                  'Add to Wishlist'
                )}
              </button>
              <button
                onClick={handleMessage}
                className="flex-1 text-center px-4 py-2 text-sm font-medium text-indigo-700 hover:text-indigo-800 transition-colors"
              >
                Message
              </button>
            </>
          )}
          {isOwner && (
            <>
              <Link
                href={`/announcements/edit/${announcement.id}`}
                className="flex-1 text-center px-4 py-2 text-sm font-medium text-indigo-700 hover:text-indigo-800 transition-colors"
              >
                Edit
              </Link>
              <button
                onClick={handleDelete}
                className="flex-1 text-center px-4 py-2 text-sm font-medium text-red-700 hover:text-red-800 transition-colors"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
} 