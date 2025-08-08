'use client'

import { useState, useEffect } from 'react'
import { useAuthGuard } from '@/lib/useAuthGuard'
import { api, Package } from '@/lib/api'

export default function BillingPage() {
  const { isAuthenticated, loading, token, user } = useAuthGuard()
  const [packages, setPackages] = useState<Package[]>([])
  const [loadingPackages, setLoadingPackages] = useState(true)
  const [processingPackage, setProcessingPackage] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isAuthenticated) {
      loadPackages()
    }
  }, [isAuthenticated])

  const loadPackages = async () => {
    try {
      const packagesData = await api.getPackages()
      setPackages(packagesData)
    } catch (error) {
      console.error('Failed to load packages:', error)
      setError('Failed to load packages')
    } finally {
      setLoadingPackages(false)
    }
  }

  const handlePurchase = async (packageId: string) => {
    if (!token) return

    setProcessingPackage(packageId)
    setError('')

    try {
      const { url } = await api.createCheckoutSession(packageId, token)
      window.location.href = url
    } catch (error) {
      console.error('Failed to create checkout session:', error)
      setError('Failed to start checkout process')
    } finally {
      setProcessingPackage(null)
    }
  }

  const formatPrice = (priceUsd: number) => {
    return `$${(priceUsd / 100).toFixed(2)}`
  }

  if (loading || loadingPackages) {
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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Billing & Token Packages</h1>
        <p className="text-gray-600 mt-2">
          Purchase token packages to continue chatting with our AI assistant.
        </p>
      </div>

      {/* Current Balance */}
      <div className="card mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Current Balance</h2>
            <p className="text-gray-600">Available tokens for chat</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary-600">
              {user?.balance || 0} tokens
            </div>
            <p className="text-sm text-gray-500">
              ~{Math.floor((user?.balance || 0) / 10)} messages*
            </p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Success Message */}
      {typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('success') && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md">
          🎉 Payment successful! Your tokens have been added to your account.
        </div>
      )}

      {/* Canceled Message */}
      {typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('canceled') && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 text-yellow-600 px-4 py-3 rounded-md">
          Payment was canceled. You can try again anytime.
        </div>
      )}

      {/* Token Packages */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Token Packages</h2>
        
        {packages.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-gray-500">No packages available at the moment.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {packages.map((pkg) => (
              <div key={pkg.id} className="card border border-gray-200 hover:border-primary-300 transition-colors">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{pkg.name}</h3>
                  <p className="text-gray-600 text-sm mt-1">{pkg.description}</p>
                </div>

                <div className="text-center mb-4">
                  <div className="text-2xl font-bold text-primary-600">
                    {pkg.tokens.toLocaleString()} tokens
                  </div>
                  <div className="text-lg font-semibold text-gray-900 mt-1">
                    {formatPrice(pkg.priceUsd)}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    ~{Math.floor(pkg.tokens / 10)} messages*
                  </p>
                </div>

                <button
                  onClick={() => handlePurchase(pkg.id)}
                  disabled={processingPackage === pkg.id}
                  className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingPackage === pkg.id ? 'Processing...' : 'Purchase'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Usage Information */}
      <div className="card bg-blue-50 border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">How Token Usage Works</h3>
        <div className="text-blue-800 text-sm space-y-1">
          <p>• Tokens are consumed for both your messages and AI responses</p>
          <p>• Longer messages use more tokens (roughly 1 token per 4 characters)</p>
          <p>• *Message estimates are approximate and may vary based on content</p>
          <p>• Tokens are deducted from your balance when messages are processed</p>
          <p>• You can monitor your token usage in real-time during conversations</p>
        </div>
      </div>
    </div>
  )
}