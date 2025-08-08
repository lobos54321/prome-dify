import { pricingCalculator } from './pricing.js';
import { prisma } from '../db/prisma.js';
export class UsageEstimator {
    // Token estimation constants
    CHARS_PER_TOKEN = 4; // Rough estimate for English text
    BASE_SYSTEM_TOKENS = 50; // Base system message overhead
    CONTEXT_MULTIPLIER = 1.2; // Multiplier for conversation context
    estimateTokensFromText(text) {
        const baseTokens = Math.ceil(text.length / this.CHARS_PER_TOKEN);
        return baseTokens + this.BASE_SYSTEM_TOKENS;
    }
    estimateResponseTokens(context) {
        let baseEstimate = 50; // Minimum response
        // Adjust based on message complexity
        switch (context.complexity) {
            case 'simple':
                baseEstimate = 50;
                break;
            case 'medium':
                baseEstimate = 150;
                break;
            case 'complex':
                baseEstimate = 300;
                break;
        }
        // Adjust for conversation length
        if (context.conversationLength > 5) {
            baseEstimate *= 1.3;
        }
        // Adjust for special requests
        if (context.hasCodeRequests) {
            baseEstimate *= 2;
        }
        if (context.hasFileUploads) {
            baseEstimate *= 1.5;
        }
        return Math.ceil(baseEstimate);
    }
    async estimateUsageCost(prompt, modelName = 'gpt-3.5-turbo', context) {
        const fullContext = {
            messageLength: prompt.length,
            conversationLength: context?.conversationLength || 1,
            complexity: this.detectComplexity(prompt),
            hasCodeRequests: this.hasCodeRequest(prompt),
            hasFileUploads: context?.hasFileUploads || false,
        };
        const inputTokens = this.estimateTokensFromText(prompt);
        const outputTokens = this.estimateResponseTokens(fullContext);
        const totalTokens = Math.ceil((inputTokens + outputTokens) * this.CONTEXT_MULTIPLIER);
        const estimatedCost = pricingCalculator.calculateTokenCost(modelName, totalTokens);
        return {
            modelName,
            estimatedTokens: totalTokens,
            estimatedCost,
            confidenceLevel: this.getConfidenceLevel(fullContext),
        };
    }
    detectComplexity(text) {
        const complexityIndicators = [
            /write.*code|create.*function|implement/i,
            /explain.*detail|analyze.*deep|comprehensive/i,
            /step.*by.*step|tutorial|guide/i,
            /multiple.*options|compare.*contrast|pros.*cons/i,
        ];
        const simpleIndicators = [
            /^(yes|no|maybe|ok|thanks)/i,
            /^.{1,20}$/,
            /what.*is|who.*is|when.*is|where.*is/i,
        ];
        if (simpleIndicators.some(pattern => pattern.test(text))) {
            return 'simple';
        }
        if (complexityIndicators.some(pattern => pattern.test(text))) {
            return 'complex';
        }
        return 'medium';
    }
    hasCodeRequest(text) {
        const codeIndicators = [
            /write.*code|create.*function|implement.*class/i,
            /javascript|python|typescript|react|node/i,
            /function|class|method|algorithm/i,
            /debug|fix.*code|error.*in.*code/i,
        ];
        return codeIndicators.some(pattern => pattern.test(text));
    }
    getConfidenceLevel(context) {
        let confidence = 'medium';
        // High confidence for simple, short messages
        if (context.complexity === 'simple' && context.messageLength < 100) {
            confidence = 'high';
        }
        // Low confidence for complex requests with many variables
        if (context.complexity === 'complex' &&
            (context.hasCodeRequests || context.hasFileUploads)) {
            confidence = 'low';
        }
        return confidence;
    }
    async getUserUsageStats(userId, days = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const usageRecords = await prisma.usage.findMany({
            where: {
                userId,
                createdAt: {
                    gte: startDate,
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        const totalTokens = usageRecords.reduce((sum, record) => sum + record.tokens, 0);
        const totalCost = usageRecords.reduce((sum, record) => sum + record.cost, 0);
        const averageDaily = totalCost / days;
        // Calculate top models
        const modelUsage = new Map();
        for (const record of usageRecords) {
            const current = modelUsage.get(record.model) || 0;
            modelUsage.set(record.model, current + record.tokens);
        }
        const topModels = Array.from(modelUsage.entries())
            .map(([model, usage]) => ({ model, usage }))
            .sort((a, b) => b.usage - a.usage)
            .slice(0, 5);
        return {
            totalTokens,
            totalCost,
            averageDaily,
            topModels,
        };
    }
}
export const usageEstimator = new UsageEstimator();
