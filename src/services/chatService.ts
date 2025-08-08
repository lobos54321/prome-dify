import { PrismaClient } from '@prisma/client';
import { Conversation, Message } from '../types';

const prisma = new PrismaClient();

export class ChatService {
  async createConversation(userId: string, title?: string): Promise<Conversation> {
    return await prisma.conversation.create({
      data: {
        userId,
        title: title || 'New Conversation'
      }
    });
  }

  async addMessage(
    conversationId: string, 
    role: 'user' | 'assistant', 
    content: string, 
    tokens?: number
  ): Promise<Message> {
    return await prisma.message.create({
      data: {
        conversationId,
        role,
        content,
        tokens
      }
    });
  }

  async getConversation(conversationId: string, userId: string): Promise<Conversation | null> {
    return await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId
      }
    });
  }

  async getMessages(conversationId: string, userId: string): Promise<Message[]> {
    // Verify user owns this conversation
    const conversation = await this.getConversation(conversationId, userId);
    if (!conversation) return [];

    return await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' }
    });
  }

  async getUserConversations(userId: string): Promise<Conversation[]> {
    return await prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' }
    });
  }

  /**
   * Simulate AI response generation
   * In a real app, this would call an AI service like OpenAI
   */
  async generateResponse(userMessage: string): Promise<{ content: string; tokens: number }> {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Simple echo response with token calculation
    const content = `AI Response to: "${userMessage}". This is a simulated response for demonstration.`;
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

export const chatService = new ChatService();