'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import NavigationBar from '@/components/NavigationBar'
import Image from 'next/image'

interface Profile {
  id: string
  email: string
  role: string
  photo_url: string | null
  location: string | null
  created_at: string
  updated_at: string
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [newLocation, setNewLocation] = useState('')
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    let mounted = true;

    const fetchProfile = async () => {
      try {
        // 1. Get the session
        console.log('1. Attempting to get session...');
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.log('Session error details:', {
            code: sessionError.code,
            message: sessionError.message,
            status: sessionError.status
          });
          throw new Error(`Session error: ${sessionError.message}`)
        }

        console.log('2. Session data:', sessionData);
        const session = sessionData?.session
        if (!session?.user) {
          console.log('3. No session found, redirecting to login...');
          router.push('/login')
          return
        }

        console.log('4. User found:', {
          id: session.user.id,
          email: session.user.email
        });

        // 2. Try to get the profile with a simple query
        console.log('5. Attempting to fetch profile...');
        const { data, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .limit(1)
          .single()

        console.log('6. Profile query response:', {
          data,
          error: profileError ? {
            code: profileError.code,
            message: profileError.message,
            details: profileError.details,
            hint: profileError.hint
          } : null
        });

        if (profileError) {
          if (profileError.code === 'PGRST116') {
            console.log('7. Profile not found, creating new one...');
            const newProfileData = {
              id: session.user.id,
              email: session.user.email,
              role: 'user',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            console.log('8. New profile data:', newProfileData);

            const { data: newProfile, error: createError } = await supabase
              .from('user_profiles')
              .insert(newProfileData)
              .select()
              .single()

            if (createError) {
              console.log('9. Profile creation error:', {
                code: createError.code,
                message: createError.message,
                details: createError.details,
                hint: createError.hint
              });
              throw createError;
            }

            console.log('10. New profile created:', newProfile);
            if (mounted) {
              setProfile(newProfile)
              setNewLocation(newProfile?.location || '')
            }
          } else {
            console.log('11. Profile fetch error:', {
              code: profileError.code,
              message: profileError.message,
              details: profileError.details,
              hint: profileError.hint
            });
            throw profileError
          }
        } else if (mounted) {
          console.log('12. Existing profile found:', data);
          setProfile(data)
          setNewLocation(data?.location || '')
        }
      } catch (err: any) {
        console.error('Profile fetch error:', {
          name: err.name,
          message: err.message,
          code: err.code,
          details: err.details,
          hint: err.hint,
          stack: err.stack
        });
        if (mounted) {
          setError(err.message || 'Failed to load profile')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchProfile()

    return () => {
      mounted = false
    }
  }, [supabase, router])

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!profile?.id) {
        throw new Error('No profile ID available')
      }

      setUploading(true)
      const file = e.target.files?.[0]
      if (!file) {
        throw new Error('No file selected')
      }

      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        throw new Error('File size must be less than 2MB')
      }

      // Check file type
      const allowedTypes = ['image/png', 'image/jpeg', 'image/gif']
      if (!allowedTypes.includes(file.type)) {
        throw new Error('File must be PNG, JPEG, or GIF')
      }

      const fileExt = file.name.split('.').pop()
      const filePath = `${profile.id}-${Date.now()}.${fileExt}`

      console.log('Starting photo upload...', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        filePath
      })

      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Upload error details:', {
          code: uploadError.code,
          message: uploadError.message,
          details: uploadError.details,
          hint: uploadError.hint
        })
        throw uploadError
      }

      console.log('File uploaded successfully, getting public URL...')

      const { data: urlData } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(filePath)

      console.log('Public URL generated:', urlData.publicUrl)

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ 
          photo_url: urlData.publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id)

      if (updateError) {
        console.error('Update error details:', {
          code: updateError.code,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint
        })
        throw updateError
      }

      console.log('Profile updated successfully')
      setProfile(prev => prev ? { ...prev, photo_url: urlData.publicUrl } : null)
    } catch (err: any) {
      console.error('Photo upload error:', {
        name: err.name,
        message: err.message,
        code: err.code,
        details: err.details,
        hint: err.hint,
        stack: err.stack
      })
      setError(err.message || 'Failed to upload photo')
    } finally {
      setUploading(false)
    }
  }

  const handleLocationUpdate = async () => {
    try {
      if (!profile?.id) {
        throw new Error('No profile ID available')
      }

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ 
          location: newLocation,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id)

      if (updateError) throw updateError

      setProfile(prev => prev ? { ...prev, location: newLocation } : null)
    } catch (err: any) {
      console.error('Location update error:', err)
      setError(err.message || 'Failed to update location')
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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavigationBar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Error</h2>
            <p className="mt-2 text-gray-600">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationBar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex flex-col items-center space-y-6">
            <div className="relative">
              {profile?.photo_url ? (
                <Image
                  src={profile.photo_url}
                  alt="Profile"
                  width={150}
                  height={150}
                  className="rounded-full object-cover"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-4xl text-gray-400">👤</span>
                </div>
              )}
              <label className="absolute bottom-0 right-0 bg-indigo-600 text-white p-2 rounded-full cursor-pointer hover:bg-indigo-700">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  disabled={uploading}
                />
                {uploading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </label>
            </div>

            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">{profile?.email}</h2>
              <p className="text-gray-600">Role: {profile?.role}</p>
              <p className="text-sm text-gray-500">Member since: {new Date(profile?.created_at || '').toLocaleDateString()}</p>
            </div>

            <div className="w-full max-w-md">
              <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                Location
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <input
                  type="text"
                  id="location"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="flex-1 min-w-0 block w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Enter your location"
                />
                <button
                  type="button"
                  onClick={handleLocationUpdate}
                  className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
} 