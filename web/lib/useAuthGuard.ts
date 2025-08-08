'use client'

import { useAuth } from './auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function useAuthGuard() {
  const { user, token, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user && !token) {
      router.push('/login')
    }
  }, [user, token, loading, router])

  return { user, token, loading, isAuthenticated: !!user && !!token }
}