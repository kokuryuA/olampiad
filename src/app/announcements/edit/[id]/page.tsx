'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import CreateAnnouncement from '@/components/CreateAnnouncement'
import { use } from 'react'

export default function EditAnnouncementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [announcement, setAnnouncement] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.push('/login')
          return
        }

        const { data, error } = await supabase
          .from('announcements')
          .select('*')
          .eq('id', id)
          .single()

        if (error) throw error

        // Check if the current user is the owner of the announcement
        if (data.user_id !== session.user.id) {
          router.push('/dashboard')
          return
        }

        setAnnouncement(data)
      } catch (error) {
        console.error('Error fetching announcement:', error)
        router.push('/dashboard')
      } finally {
        setLoading(false)
      }
    }

    fetchAnnouncement()
  }, [id, router, supabase])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!announcement) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CreateAnnouncement 
        isEdit={true}
        initialData={announcement}
      />
    </div>
  )
} 