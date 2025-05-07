import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import HomeClient from './HomeClient'

export default async function HomePage() {
  const supabase = createServerComponentClient({ cookies })
  
  const { data: { session } } = await supabase.auth.getSession()
  const currentUserId = session?.user?.id || null

  const { data: announcements = [] } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false })

  return <HomeClient initialAnnouncements={announcements} currentUserId={currentUserId} />
} 