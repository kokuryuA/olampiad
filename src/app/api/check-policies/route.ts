import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Check announcements table policies
    const { data: announcementPolicies, error: announcementError } = await supabase
      .rpc('get_policies', { table_name: 'announcements' })

    // Check storage policies
    const { data: storagePolicies, error: storageError } = await supabase
      .rpc('get_storage_policies')

    return NextResponse.json({
      status: 'success',
      announcementPolicies,
      storagePolicies,
      errors: {
        announcement: announcementError,
        storage: storageError
      }
    })
  } catch (error) {
    console.error('Error checking policies:', error)
    return NextResponse.json({ error: 'Internal server error', details: error }, { status: 500 })
  }
} 