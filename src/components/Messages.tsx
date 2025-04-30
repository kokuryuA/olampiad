'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

interface Profile {
  id: string
  email: string
}

interface Announcement {
  id: string
  title: string
}

interface Message {
  id: string
  sender_id: string
  receiver_id: string
  announcement_id: string
  content: string
  created_at: string
  is_read: boolean
  sender: Profile
  receiver: Profile
  announcements: Announcement
}

interface Conversation {
  announcement_id: string
  announcement_title: string
  other_user: Profile
  last_message: string
  last_message_time: string
  unread_count: number
}

export default function Messages() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  
  const router = useRouter()
  const supabase = createClientComponentClient()

  const ensureUserProfile = async (userId: string, email: string) => {
    const { data: existingProfile, error: fetchError } = await supabase
      .from('user_profiles')
      .select('id, email')
      .eq('id', userId)
      .single()

    if (fetchError || !existingProfile) {
      const { error: createError } = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          email: email,
          created_at: new Date().toISOString()
        })
      
      if (createError) throw new Error(`Profile creation failed: ${createError.message}`)
      return { id: userId, email }
    }
    return existingProfile
  }

  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError || !session) {
          router.push('/login')
          return
        }

        const profile = await ensureUserProfile(
          session.user.id, 
          session.user.email || ''
        )

        setCurrentUser(profile)
        await fetchConversations(session.user.id)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Initialization failed')
      } finally {
        setLoading(false)
      }
    }

    initialize()
  }, [])

  useEffect(() => {
    if (selectedConversation) fetchMessages(selectedConversation)
  }, [selectedConversation])

  const fetchConversations = async (userId: string) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          sender_id,
          receiver_id,
          announcement_id,
          announcements:announcement_id(title),
          sender:sender_id(id, email),
          receiver:receiver_id(id, email),
          content,
          created_at,
          is_read
        `)
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false })

      if (error) throw error

      const conversationsMap = new Map<string, Conversation>()

      data?.forEach((message) => {
        try {
          const otherUser = message.sender_id === userId 
            ? message.receiver 
            : message.sender

          if (!message.announcement_id || !message.announcements?.title) {
            console.warn('Skipping invalid message:', message)
            return
          }

          const existing = conversationsMap.get(message.announcement_id)
          
          if (existing) {
            if (message.receiver_id === userId && !message.is_read) {
              existing.unread_count++
            }
          } else {
            conversationsMap.set(message.announcement_id, {
              announcement_id: message.announcement_id,
              announcement_title: message.announcements.title,
              other_user: {
                id: otherUser?.id || 'unknown',
                email: otherUser?.email || 'unknown@example.com'
              },
              last_message: message.content,
              last_message_time: message.created_at,
              unread_count: (message.receiver_id === userId && !message.is_read) ? 1 : 0
            })
          }
        } catch (e) {
          console.error('Error processing message:', message, e)
        }
      })

      setConversations(Array.from(conversationsMap.values()))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations')
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (announcementId: string) => {
    try {
      setLoading(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id(id, email),
          receiver:receiver_id(id, email)
        `)
        .eq('announcement_id', announcementId)
        .order('created_at', { ascending: true })

      if (error) throw error

      const unreadMessages = data?.filter(m => 
        !m.is_read && m.receiver_id === session.user.id
      )

      if (unreadMessages?.length > 0) {
        const { error: updateError } = await supabase
          .from('messages')
          .update({ is_read: true })
          .in('id', unreadMessages.map(m => m.id))

        if (updateError) throw updateError
      }

      setMessages(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages')
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !currentUser) return

    try {
      setLoading(true)
      setError(null)

      const conversation = conversations.find(
        c => c.announcement_id === selectedConversation
      )
      if (!conversation) return

      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: currentUser.id,
          receiver_id: conversation.other_user.id,
          announcement_id: selectedConversation,
          content: newMessage.trim()
        })

      if (error) throw error

      setNewMessage('')
      await Promise.all([
        fetchMessages(selectedConversation),
        fetchConversations(currentUser.id)
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="flex h-[600px] border rounded-lg overflow-hidden">
      {/* Error Banner */}
      {error && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50">
          {error}
        </div>
      )}

      {/* Conversations List */}
      <div className="w-1/3 border-r overflow-y-auto">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
        </div>
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-700">
            No conversations yet
          </div>
        ) : (
          <div className="divide-y">
            {conversations.map((conversation) => (
              <div
                key={conversation.announcement_id}
                className={`p-4 cursor-pointer hover:bg-gray-50 ${
                  selectedConversation === conversation.announcement_id ? 'bg-indigo-50' : ''
                }`}
                onClick={() => setSelectedConversation(conversation.announcement_id)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {conversation.announcement_title}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {conversation.other_user.email}
                    </p>
                  </div>
                  {conversation.unread_count > 0 && (
                    <span className="bg-indigo-600 text-white text-xs px-2 py-1 rounded-full">
                      {conversation.unread_count}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-gray-600 truncate">
                  {conversation.last_message}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  {new Date(conversation.last_message_time).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Messages Panel */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            <div className="flex-1 overflow-y-auto p-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`mb-4 ${
                    message.sender_id === currentUser?.id
                      ? 'ml-auto'
                      : 'mr-auto'
                  }`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      message.sender_id === currentUser?.id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs mt-1 opacity-70">
                      {new Date(message.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t p-4">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <button
                  onClick={sendMessage}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a conversation to start messaging
          </div>
        )}
      </div>
    </div>
  )
}