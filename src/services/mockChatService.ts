import { mockDb } from './mockDatabase';

export class MockChatService {
  async createConversation(userId: string, title?: string): Promise<any> {
    return mockDb.createConversation(userId, title);
  }

  async addMessage(
    conversationId: string, 
    role: 'user' | 'assistant', 
    content: string, 
    tokens?: number
  ): Promise<any> {
    return mockDb.createMessage(conversationId, role, content, tokens);
  }

  async getConversation(conversationId: string, userId: string): Promise<any | null> {
    return mockDb.findConversation(conversationId, userId);
  }

  async getMessages(conversationId: string, userId: string): Promise<any[]> {
    // Verify user owns this conversation
    const conversation = await this.getConversation(conversationId, userId);
    if (!conversation) return [];

    return mockDb.getMessages(conversationId);
  }

  async getUserConversations(userId: string): Promise<any[]> {
    return mockDb.getUserConversations(userId);
  }

  /**
   * Simulate AI response generation
   * In a real app, this would call an AI service like OpenAI
   */
  async generateResponse(userMessage: string): Promise<{ content: string; tokens: number }> {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Simple echo response with token calculation
    const responses = [
      `That's an interesting question about "${userMessage}". Let me think about that and provide you with a helpful response.`,
      `I understand you're asking about "${userMessage}". Here's what I can tell you based on my knowledge.`,
      `Thanks for your message about "${userMessage}". I'd be happy to help you with that topic.`,
      `Regarding "${userMessage}", there are several important points to consider. Let me break this down for you.`,
      `Your question about "${userMessage}" touches on some fascinating concepts. Allow me to explain in detail.`
    ];
    
    const content = responses[Math.floor(Math.random() * responses.length)];
    const tokens = Math.floor(content.length / 4); // Rough token estimation
    
    return { content, tokens };
  }

  /**
   * Estimate token count for text
   * In a real app, use proper tokenization library
   */
  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}

export const mockChatService = new MockChatService();