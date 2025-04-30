import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Check buckets
    console.log('Checking storage buckets...')
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets()

    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError)
      return NextResponse.json({ error: 'Failed to list buckets', details: bucketsError }, { status: 500 })
    }

    // Check if announcements bucket exists
    const announcementsBucket = buckets.find(b => b.name === 'announcements')
    
    if (!announcementsBucket) {
      console.log('Creating announcements bucket...')
      const { error: createError } = await supabase
        .storage
        .createBucket('announcements', {
          public: true,
          fileSizeLimit: 2097152, // 2MB
          allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif']
        })

      if (createError) {
        console.error('Error creating bucket:', createError)
        return NextResponse.json({ error: 'Failed to create bucket', details: createError }, { status: 500 })
      }
    }

    // Check RLS policies
    const { data: policies, error: policiesError } = await supabase
      .from('storage')
      .select('policies')
      .eq('bucket_id', 'announcements')
      .single()

    return NextResponse.json({
      status: 'success',
      buckets,
      announcementsBucket: announcementsBucket || 'Created new bucket',
      policies
    })
  } catch (error) {
    console.error('Error checking storage:', error)
    return NextResponse.json({ error: 'Internal server error', details: error }, { status: 500 })
  }
} 