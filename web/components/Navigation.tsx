'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'

export default function Navigation() {
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <nav className="bg-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <Link href="/" className="text-xl font-bold text-primary-600">
            Prome-Dify
          </Link>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link 
                  href="/chat" 
                  className="text-gray-700 hover:text-primary-600 transition-colors"
                >
                  Chat
                </Link>
                <Link 
                  href="/billing" 
                  className="text-gray-700 hover:text-primary-600 transition-colors"
                >
                  Billing
                </Link>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">
                    {user.email}
                  </span>
                  <span className="bg-primary-100 text-primary-800 text-sm font-medium px-2 py-1 rounded">
                    {user.balance} tokens
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-gray-700 hover:text-red-600 transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <div className="flex space-x-2">
                <Link 
                  href="/login" 
                  className="text-gray-700 hover:text-primary-600 transition-colors"
                >
                  Login
                </Link>
                <Link 
                  href="/register" 
                  className="btn-primary"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}