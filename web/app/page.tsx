'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/auth'

export default function HomePage() {
  const { user } = useAuth()

  return (
    <div className="text-center">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">
          Welcome to Prome-Dify
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Your AI-powered chat platform with transparent token-based billing
        </p>

        <div className="grid gap-6 md:grid-cols-3 mb-12">
          <div className="card text-center">
            <div className="text-3xl mb-4">🤖</div>
            <h3 className="text-lg font-semibold mb-2">AI Chat</h3>
            <p className="text-gray-600">
              Have natural conversations with our advanced AI assistant
            </p>
          </div>

          <div className="card text-center">
            <div className="text-3xl mb-4">⚡</div>
            <h3 className="text-lg font-semibold mb-2">Real-time Streaming</h3>
            <p className="text-gray-600">
              Get responses as they're generated with live streaming
            </p>
          </div>

          <div className="card text-center">
            <div className="text-3xl mb-4">💎</div>
            <h3 className="text-lg font-semibold mb-2">Token-based Billing</h3>
            <p className="text-gray-600">
              Pay only for what you use with transparent token pricing
            </p>
          </div>
        </div>

        {user ? (
          <div className="space-y-4">
            <p className="text-lg text-gray-700">
              Welcome back, {user.email}! You have {user.balance} tokens available.
            </p>
            <div className="space-x-4">
              <Link href="/chat" className="btn-primary">
                Start Chatting
              </Link>
              <Link href="/billing" className="btn-secondary">
                Manage Billing
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-lg text-gray-700">
              Get started with your AI assistant today!
            </p>
            <div className="space-x-4">
              <Link href="/register" className="btn-primary">
                Sign Up Free
              </Link>
              <Link href="/login" className="btn-secondary">
                Sign In
              </Link>
            </div>
            <p className="text-sm text-gray-500">
              New users get 1,000 free tokens to start!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}