export interface SSEEvent {
  event: string
  data: any
}

export interface ChatMetaEvent {
  conversation_id: string
}

export interface ChatUsageEvent {
  conversationId: string
  tokensUsed: number
  balanceAfter: number
}

export interface ChatAnswerEvent {
  content: string
  finished?: boolean
}

export interface ChatErrorEvent {
  error: string
  balance?: number
}

export class SSEClient {
  private abortController?: AbortController

  async startChat(
    message: string,
    token: string,
    conversationId?: string,
    onEvent?: (event: SSEEvent) => void
  ): Promise<void> {
    this.abortController = new AbortController()

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message, conversationId }),
        signal: this.abortController.signal
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      if (!response.body) {
        throw new Error('No response body')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      try {
        while (true) {
          const { done, value } = await reader.read()
          
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('event:')) {
              const event = line.slice(6).trim()
              continue
            }
            
            if (line.startsWith('data:')) {
              const data = line.slice(5).trim()
              if (data) {
                try {
                  const parsedData = JSON.parse(data)
                  const eventType = this.getEventType(lines, lines.indexOf(line))
                  
                  if (onEvent) {
                    onEvent({ event: eventType, data: parsedData })
                  }
                } catch (error) {
                  console.error('Error parsing SSE data:', error)
                }
              }
            }
          }
        }
      } finally {
        reader.releaseLock()
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Chat request aborted')
      } else {
        console.error('Chat error:', error)
        throw error
      }
    }
  }

  private getEventType(lines: string[], dataIndex: number): string {
    // Look backwards for the most recent event line
    for (let i = dataIndex - 1; i >= 0; i--) {
      if (lines[i].startsWith('event:')) {
        return lines[i].slice(6).trim()
      }
    }
    return 'unknown'
  }

  abort(): void {
    if (this.abortController) {
      this.abortController.abort()
    }
  }
}