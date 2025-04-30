'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

interface CreateAnnouncementProps {
  isEdit?: boolean;
  initialData?: {
    id: string;
    title: string;
    description: string;
    price: number;
    image_url: string | null;
  };
}

export default function CreateAnnouncement({ isEdit = false, initialData }: CreateAnnouncementProps) {
  const [title, setTitle] = useState(initialData?.title || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [price, setPrice] = useState(initialData?.price?.toString() || '')
  const [image, setImage] = useState<File | null>(null)
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(initialData?.image_url || null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClientComponentClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    console.log('Starting announcement ' + (isEdit ? 'update' : 'creation') + '...')

    try {
      // Get the user session first
      console.log('Checking user session...')
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('Session error:', sessionError)
        throw new Error('Failed to get user session')
      }

      if (!session) {
        console.error('No session found')
        throw new Error('You must be logged in to ' + (isEdit ? 'edit' : 'create') + ' an announcement')
      }

      console.log('User session found:', session.user.id)

      let imageUrl = existingImageUrl

      // Upload new image if provided
      if (image) {
        try {
          console.log('Starting image upload process...')
          console.log('Image details:', {
            name: image.name,
            size: image.size,
            type: image.type
          })

          // Generate a unique filename
          const fileExt = image.name.split('.').pop()
          const fileName = `${session.user.id}/${Date.now()}.${fileExt}`
          console.log('Generated filename:', fileName)

          // Upload the file directly to the announcements bucket
          console.log('Uploading file...')
          const { error: uploadError, data: uploadData } = await supabase.storage
            .from('announcements')
            .upload(fileName, image, {
              cacheControl: '3600',
              upsert: false
            })

          if (uploadError) {
            console.error('Upload error:', uploadError)
            throw new Error(uploadError.message || 'Failed to upload image')
          }

          console.log('File uploaded successfully:', uploadData)

          // Get the public URL
          const { data: { publicUrl } } = supabase.storage
            .from('announcements')
            .getPublicUrl(fileName)

          console.log('Generated public URL:', publicUrl)
          imageUrl = publicUrl
        } catch (storageError) {
          console.error('Storage error:', storageError)
          throw new Error(storageError instanceof Error ? storageError.message : 'Failed to upload image')
        }
      }

      if (isEdit && initialData) {
        // Update announcement
        console.log('Updating announcement record...')
        const { error: updateError } = await supabase
          .from('announcements')
          .update({
            title,
            description,
            price: parseFloat(price),
            image_url: imageUrl,
          })
          .eq('id', initialData.id)

        if (updateError) {
          console.error('Update error:', updateError)
          throw new Error(updateError.message || 'Failed to update announcement')
        }

        console.log('Announcement updated successfully')
      } else {
        // Create announcement
        console.log('Creating announcement record...')
        const { error: insertError } = await supabase
          .from('announcements')
          .insert({
            title,
            description,
            price: parseFloat(price),
            image_url: imageUrl,
            user_id: session.user.id
          })

        if (insertError) {
          console.error('Insert error:', insertError)
          throw new Error(insertError.message || 'Failed to create announcement')
        }

        console.log('Announcement created successfully')
      }

      router.push('/dashboard')
      router.refresh()
    } catch (error) {
      console.error('Error ' + (isEdit ? 'updating' : 'creating') + ' announcement:', error)
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('An error occurred while ' + (isEdit ? 'updating' : 'creating') + ' the announcement')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              {isEdit ? 'Edit Announcement' : 'Create New Announcement'}
            </h3>
            <form onSubmit={handleSubmit} className="mt-5 space-y-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-900">
                  Title
                </label>
                <input
                  type="text"
                  id="title"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-900">
                  Description
                </label>
                <textarea
                  id="description"
                  required
                  rows={4}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-900">
                  Price
                </label>
                <input
                  type="number"
                  id="price"
                  required
                  min="0"
                  step="0.01"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="image" className="block text-sm font-medium text-gray-900">
                  Image (Optional, max 2MB)
                </label>
                {existingImageUrl && (
                  <div className="mt-2">
                    <img 
                      src={existingImageUrl} 
                      alt="Current announcement image" 
                      className="h-32 w-32 object-cover rounded-md"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setExistingImageUrl(null)
                        setImage(null)
                      }}
                      className="mt-2 text-sm text-red-700 hover:text-red-800"
                    >
                      Remove current image
                    </button>
                  </div>
                )}
                <input
                  type="file"
                  id="image"
                  accept="image/png,image/jpeg,image/gif"
                  className="mt-1 block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file && file.size > 2 * 1024 * 1024) {
                      setError('Image size must be less than 2MB')
                      e.target.value = ''
                      return
                    }
                    setImage(file || null)
                    setError(null)
                  }}
                />
                <p className="mt-1 text-sm text-gray-700">
                  Supported formats: PNG, JPEG, GIF. Max file size: 2MB
                </p>
              </div>

              {error && (
                <div className="text-red-700 text-sm bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-700 hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update Announcement' : 'Create Announcement')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
} 