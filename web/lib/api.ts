const API_BASE = process.env.NEXT_PUBLIC_API_BASE || ''

export interface Package {
  id: string
  name: string
  description: string
  tokens: number
  priceUsd: number
  stripePriceId: string
  active: boolean
  createdAt: string
}

export const api = {
  async getPackages(): Promise<Package[]> {
    const response = await fetch(`${API_BASE}/api/billing/packages`)
    const data = await response.json()
    return data.packages || []
  },

  async createCheckoutSession(packageId: string, token: string): Promise<{ url: string }> {
    const response = await fetch(`${API_BASE}/api/billing/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ packageId })
    })
    
    if (!response.ok) {
      throw new Error('Failed to create checkout session')
    }
    
    return response.json()
  },

  async getUserBalance(token: string): Promise<{ balance: number }> {
    const response = await fetch(`${API_BASE}/api/billing/balance`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    if (!response.ok) {
      throw new Error('Failed to get balance')
    }
    
    return response.json()
  },

  async getConversations(token: string) {
    const response = await fetch(`${API_BASE}/api/conversations`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    if (!response.ok) {
      throw new Error('Failed to get conversations')
    }
    
    return response.json()
  },

  async getMessages(conversationId: string, token: string) {
    const response = await fetch(`${API_BASE}/api/conversations/${conversationId}/messages`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    if (!response.ok) {
      throw new Error('Failed to get messages')
    }
    
    return response.json()
  }
}