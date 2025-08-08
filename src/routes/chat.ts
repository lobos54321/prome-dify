import { Router, Response } from 'express';
import { AuthRequest } from '../types';
import { authenticateToken } from '../middleware/auth';
import { chatService } from '../services/chatService';
import { usageService } from '../services/usageService';

const router = Router();

// SSE helper function
const writeSSE = (res: Response, event: string, data: any): void => {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
};

/**
 * POST /api/chat - Streaming chat endpoint with SSE
 * Emits: meta, answer, usage, done, error events
 */
router.post('/chat', authenticateToken, async (req: AuthRequest, res: Response): Promise<Response<any> | void> => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { message, conversationId } = req.body as { message: string; conversationId?: string };

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    let currentConversationId = conversationId;

    try {
      // Create new conversation if none provided
      if (!currentConversationId) {
        const conversation = await chatService.createConversation(req.user.id);
        currentConversationId = conversation.id;

        // Emit meta event with conversation_id
        writeSSE(res, 'meta', { conversation_id: currentConversationId });
      }

      // Verify conversation ownership
      const conversation = await chatService.getConversation(currentConversationId, req.user.id);
      if (!conversation) {
        writeSSE(res, 'error', { error: 'Conversation not found' });
        res.end();
        return;
      }

      // Estimate tokens for user message
      const userTokens = chatService.estimateTokens(message);

      // Add user message to conversation
      await chatService.addMessage(currentConversationId, 'user', message, userTokens);

      // Generate AI response
      const { content: aiResponse, tokens: aiTokens } = await chatService.generateResponse(message);
      
      const totalTokens = userTokens + aiTokens;

      // Try to consume tokens
      const usageResult = await usageService.consumeTokens(
        req.user.id,
        totalTokens,
        currentConversationId,
        'chat'
      );

      if (!usageResult.success) {
        writeSSE(res, 'error', { 
          error: usageResult.error || 'Failed to process request',
          balance: usageResult.balance 
        });
        res.end();
        return;
      }

      // Stream the AI response (simulate streaming by sending chunks)
      const words = aiResponse.split(' ');
      for (let i = 0; i < words.length; i++) {
        const chunk = words.slice(0, i + 1).join(' ');
        const isLast = i === words.length - 1;
        
        writeSSE(res, 'answer', { 
          content: chunk,
          finished: isLast
        });

        // Add a small delay to simulate streaming
        if (!isLast) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      // Add AI message to conversation
      await chatService.addMessage(currentConversationId, 'assistant', aiResponse, aiTokens);

      // Emit usage event with conversation ID and updated balance
      writeSSE(res, 'usage', {
        conversationId: currentConversationId,
        tokensUsed: totalTokens,
        balanceAfter: usageResult.balance
      });

      // Emit done event
      writeSSE(res, 'done', { conversationId: currentConversationId });

    } catch (error) {
      console.error('Chat processing error:', error);
      writeSSE(res, 'error', { error: 'Internal server error' });
    }

    res.end();

  } catch (error) {
    console.error('Chat route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/chat/conversations - Get user's conversations
 */
router.get('/conversations', authenticateToken, async (req: AuthRequest, res: Response): Promise<Response<any>> => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const conversations = await chatService.getUserConversations(req.user.id);
    return res.json({ conversations });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

/**
 * GET /api/chat/conversations/:id/messages - Get messages for a conversation
 */
router.get('/conversations/:id/messages', authenticateToken, async (req: AuthRequest, res: Response): Promise<Response<any>> => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Conversation ID is required' });
    }
    const messages = await chatService.getMessages(id, req.user.id);
    return res.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

export default router;