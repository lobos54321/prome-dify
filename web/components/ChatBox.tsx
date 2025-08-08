'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { SSEClient, ChatMetaEvent, ChatUsageEvent, ChatAnswerEvent, ChatErrorEvent } from '@/lib/sse'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ChatBoxProps {
  conversationId?: string
  onConversationCreated?: (conversationId: string) => void
}

export default function ChatBox({ conversationId, onConversationCreated }: ChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [currentResponse, setCurrentResponse] = useState('')
  const [tokensUsed, setTokensUsed] = useState(0)
  
  const { user, token, updateUserBalance } = useAuth()
  const sseClientRef = useRef<SSEClient>()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    sseClientRef.current = new SSEClient()
    return () => {
      if (sseClientRef.current) {
        sseClientRef.current.abort()
      }
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, currentResponse])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !token || !user) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)
    setError('')
    setCurrentResponse('')
    setTokensUsed(0)

    try {
      await sseClientRef.current?.startChat(
        userMessage.content,
        token,
        conversationId,
        (event) => {
          switch (event.event) {
            case 'meta':
              const metaData = event.data as ChatMetaEvent
              if (onConversationCreated && metaData.conversation_id) {
                onConversationCreated(metaData.conversation_id)
              }
              break

            case 'answer':
              const answerData = event.data as ChatAnswerEvent
              setCurrentResponse(answerData.content)
              if (answerData.finished) {
                const assistantMessage: Message = {
                  id: (Date.now() + 1).toString(),
                  role: 'assistant',
                  content: answerData.content,
                  timestamp: new Date()
                }
                setMessages(prev => [...prev, assistantMessage])
                setCurrentResponse('')
              }
              break

            case 'usage':
              const usageData = event.data as ChatUsageEvent
              setTokensUsed(usageData.tokensUsed)
              updateUserBalance(usageData.balanceAfter)
              break

            case 'error':
              const errorData = event.data as ChatErrorEvent
              setError(errorData.error)
              if (errorData.balance !== undefined) {
                updateUserBalance(errorData.balance)
              }
              break

            case 'done':
              setLoading(false)
              break
          }
        }
      )
    } catch (error) {
      console.error('Chat error:', error)
      setError('Failed to send message. Please try again.')
      setLoading(false)
    }
  }

  const handleAbort = () => {
    sseClientRef.current?.abort()
    setLoading(false)
    setCurrentResponse('')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <p>Start a conversation! Ask me anything.</p>
            <p className="text-sm mt-2">Your current balance: {user?.balance || 0} tokens</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.role === 'user'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 text-gray-900'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              <p className="text-xs mt-1 opacity-75">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}

        {/* Current response being streamed */}
        {currentResponse && (
          <div className="flex justify-start">
            <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-gray-200 text-gray-900">
              <p className="whitespace-pre-wrap">{currentResponse}</p>
              <div className="flex items-center mt-1">
                <div className="animate-pulse w-2 h-2 bg-gray-500 rounded-full"></div>
                <p className="text-xs ml-2 opacity-75">AI is typing...</p>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Status and error display */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {tokensUsed > 0 && (
        <div className="px-4 py-2 bg-blue-50 border-t border-blue-200">
          <p className="text-blue-600 text-sm">
            Tokens used: {tokensUsed} | Balance: {user?.balance || 0}
          </p>
        </div>
      )}

      {/* Input form */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 input-field"
            disabled={loading}
          />
          {loading ? (
            <button
              type="button"
              onClick={handleAbort}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="px-4 py-2 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          )}
        </div>
      </form>
    </div>
  )
}