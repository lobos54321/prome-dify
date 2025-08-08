import fetch from 'node-fetch';
import { config } from '../config/env.js';

export interface DifyMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface DifyChatRequest {
  inputs: Record<string, any>;
  query: string;
  response_mode: 'blocking' | 'streaming';
  conversation_id?: string;
  user: string;
}

export interface DifyChatResponse {
  id: string;
  object: string;
  created: number;
  conversation_id: string;
  mode: string;
  answer: string;
  metadata: {
    usage: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  };
}

export interface DifyStreamChunk {
  event: string;
  data: any;
}

export class DifyClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = config.dify.apiUrl;
    this.apiKey = config.dify.apiKey;
  }

  async chatCompletion(request: DifyChatRequest): Promise<DifyChatResponse> {
    const response = await fetch(`${this.baseUrl}/chat-messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Dify API error: ${response.status} - ${error}`);
    }

    return response.json() as Promise<DifyChatResponse>;
  }

  async *chatCompletionStream(request: DifyChatRequest): AsyncGenerator<DifyStreamChunk> {
    const streamRequest = { ...request, response_mode: 'streaming' as const };
    
    const response = await fetch(`${this.baseUrl}/chat-messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(streamRequest),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Dify API error: ${response.status} - ${error}`);
    }

    if (!response.body) {
      throw new Error('No response body received');
    }

    // Simple text stream processing for Node.js
    let buffer = '';
    const body = response.body as any;
    
    for await (const chunk of body) {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data.trim() === '[DONE]') {
            return;
          }
          
          try {
            const parsed = JSON.parse(data);
            yield {
              event: 'message',
              data: parsed,
            };
          } catch (error) {
            console.error('Error parsing SSE data:', error);
          }
        }
      }
    }
  }

  async getConversationMessages(conversationId: string, user: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/messages?conversation_id=${conversationId}&user=${user}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Dify API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async getConversations(user: string, page = 1, limit = 20): Promise<any> {
    const response = await fetch(`${this.baseUrl}/conversations?user=${user}&page=${page}&limit=${limit}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Dify API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async deleteConversation(conversationId: string, user: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/conversations/${conversationId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Dify API error: ${response.status} - ${error}`);
    }

    return response.json();
  }
}

export const difyClient = new DifyClient();