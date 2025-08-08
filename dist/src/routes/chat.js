import { Router } from 'express';
import { z } from 'zod';
import { authenticateToken, authenticateApiKey } from '../lib/auth.js';
import { difyClient } from '../lib/difyClient.js';
import { usageEstimator } from '../lib/estimation.js';
import { usageService } from '../services/usageService.js';
const router = Router();
const chatRequestSchema = z.object({
    query: z.string().min(1),
    conversation_id: z.string().optional(),
    inputs: z.record(z.any()).default({}),
    stream: z.boolean().default(false),
    model: z.string().default('gpt-3.5-turbo'),
});
// Middleware to authenticate either with JWT or API key
const authenticate = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (apiKey) {
        return authenticateApiKey(req, res, next);
    }
    else {
        return authenticateToken(req, res, next);
    }
};
// Estimate usage cost before making request
router.post('/estimate', authenticate, async (req, res) => {
    try {
        const { query, model } = chatRequestSchema.parse(req.body);
        const estimate = await usageEstimator.estimateUsageCost(query, model);
        const userCredits = await usageService.getUserCredits(req.user.id);
        res.json({
            estimate,
            userCredits,
            canAfford: userCredits >= estimate.estimatedCost,
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid input', details: error.errors });
        }
        console.error('Estimation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Chat completion endpoint (non-streaming)
router.post('/completion', authenticate, async (req, res) => {
    try {
        const { query, conversation_id, inputs, model } = chatRequestSchema.parse(req.body);
        // Estimate cost first
        const estimate = await usageEstimator.estimateUsageCost(query, model);
        const userCredits = await usageService.getUserCredits(req.user.id);
        if (userCredits < estimate.estimatedCost) {
            return res.status(402).json({
                error: 'Insufficient credits',
                required: estimate.estimatedCost,
                available: userCredits,
            });
        }
        // Make request to Dify
        const difyRequest = {
            inputs,
            query,
            response_mode: 'blocking',
            conversation_id,
            user: req.user.id,
        };
        const response = await difyClient.chatCompletion(difyRequest);
        // Process usage and deduct credits
        const actualTokens = response.metadata?.usage?.total_tokens || estimate.estimatedTokens;
        const usageResult = await usageService.processUsage(req.user.id, 'chat_completion', model, actualTokens, {
            conversation_id: response.conversation_id,
            dify_message_id: response.id,
        });
        res.json({
            ...response,
            usage: {
                tokens: actualTokens,
                cost: usageResult.cost,
                remainingCredits: usageResult.remainingCredits,
            },
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid input', details: error.errors });
        }
        if (error instanceof Error && error.message.includes('Dify API error')) {
            return res.status(502).json({ error: 'Dify API error', details: error.message });
        }
        console.error('Chat completion error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Chat completion endpoint (streaming)
router.post('/stream', authenticate, async (req, res) => {
    try {
        const { query, conversation_id, inputs, model } = chatRequestSchema.parse(req.body);
        // Estimate cost first
        const estimate = await usageEstimator.estimateUsageCost(query, model);
        const userCredits = await usageService.getUserCredits(req.user.id);
        if (userCredits < estimate.estimatedCost) {
            return res.status(402).json({
                error: 'Insufficient credits',
                required: estimate.estimatedCost,
                available: userCredits,
            });
        }
        // Set up SSE headers
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
        });
        let totalTokens = 0;
        let finalConversationId = '';
        let finalMessageId = '';
        try {
            const difyRequest = {
                inputs,
                query,
                response_mode: 'streaming',
                conversation_id,
                user: req.user.id,
            };
            for await (const chunk of difyClient.chatCompletionStream(difyRequest)) {
                // Forward the chunk to client
                res.write(`data: ${JSON.stringify(chunk)}\n\n`);
                // Track tokens and metadata
                if (chunk.data?.metadata?.usage?.total_tokens) {
                    totalTokens = chunk.data.metadata.usage.total_tokens;
                }
                if (chunk.data?.conversation_id) {
                    finalConversationId = chunk.data.conversation_id;
                }
                if (chunk.data?.id) {
                    finalMessageId = chunk.data.id;
                }
            }
            // Process usage after streaming completes
            const actualTokens = totalTokens || estimate.estimatedTokens;
            const usageResult = await usageService.processUsage(req.user.id, 'chat_stream', model, actualTokens, {
                conversation_id: finalConversationId,
                dify_message_id: finalMessageId,
            });
            // Send final usage data
            res.write(`data: ${JSON.stringify({
                event: 'usage',
                data: {
                    tokens: actualTokens,
                    cost: usageResult.cost,
                    remainingCredits: usageResult.remainingCredits,
                }
            })}\n\n`);
        }
        catch (streamError) {
            res.write(`data: ${JSON.stringify({
                event: 'error',
                data: { error: 'Stream error occurred' }
            })}\n\n`);
        }
        res.write(`data: [DONE]\n\n`);
        res.end();
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid input', details: error.errors });
        }
        console.error('Chat stream error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get conversation history
router.get('/conversations', authenticate, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const conversations = await difyClient.getConversations(req.user.id, page, limit);
        res.json(conversations);
    }
    catch (error) {
        console.error('Conversations fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get messages in a conversation
router.get('/conversations/:conversationId/messages', authenticate, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const messages = await difyClient.getConversationMessages(conversationId, req.user.id);
        res.json(messages);
    }
    catch (error) {
        console.error('Messages fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Delete a conversation
router.delete('/conversations/:conversationId', authenticate, async (req, res) => {
    try {
        const { conversationId } = req.params;
        await difyClient.deleteConversation(conversationId, req.user.id);
        res.json({ message: 'Conversation deleted successfully' });
    }
    catch (error) {
        console.error('Conversation deletion error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
export default router;
