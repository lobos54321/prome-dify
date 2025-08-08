'use client'

import { useState, useEffect } from 'react'
import { useAuthGuard } from '@/lib/useAuthGuard'
import ChatBox from '@/components/ChatBox'

export default function ChatPage() {
  const { isAuthenticated, loading } = useAuthGuard()
  const [conversationId, setConversationId] = useState<string>()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null // Will redirect to login
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">AI Chat</h1>
        <p className="text-gray-600 mt-1">
          Have a conversation with our AI assistant. Each message consumes tokens based on length.
        </p>
      </div>

      <div className="card h-[600px]">
        <ChatBox
          conversationId={conversationId}
          onConversationCreated={setConversationId}
        />
      </div>

      <div className="mt-4 text-center text-sm text-gray-500">
        <p>
          Need more tokens? Visit the{' '}
          <a href="/billing" className="text-primary-600 hover:text-primary-700">
            billing page
          </a>{' '}
          to purchase more.
        </p>
      </div>
    </div>
  )
}