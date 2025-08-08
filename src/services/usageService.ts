import { prisma } from '../db/prisma.js';
import { pricingCalculator } from '../lib/pricing.js';

export interface UsageRecord {
  userId: string;
  operation: string;
  model: string;
  tokens: number;
  cost: number;
  metadata?: any;
}

export class UsageService {
  async recordUsage(record: UsageRecord): Promise<void> {
    await prisma.usage.create({
      data: record,
    });
  }

  async deductCredits(userId: string, amount: number): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { credits: true },
      });

      if (!user || user.credits < amount) {
        return false;
      }

      await prisma.user.update({
        where: { id: userId },
        data: {
          credits: {
            decrement: amount,
          },
        },
      });

      return true;
    } catch (error) {
      console.error('Error deducting credits:', error);
      return false;
    }
  }

  async addCredits(userId: string, amount: number): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        credits: {
          increment: amount,
        },
      },
    });
  }

  async getUserCredits(userId: string): Promise<number> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    });

    return user?.credits || 0;
  }

  async processUsage(
    userId: string,
    operation: string,
    model: string,
    tokens: number,
    metadata?: any
  ): Promise<{ success: boolean; cost: number; remainingCredits: number }> {
    const cost = pricingCalculator.calculateTokenCost(model, tokens);
    
    // Check if user has enough credits
    const currentCredits = await this.getUserCredits(userId);
    if (currentCredits < cost) {
      return {
        success: false,
        cost,
        remainingCredits: currentCredits,
      };
    }

    // Deduct credits and record usage
    const deductionSuccess = await this.deductCredits(userId, cost);
    if (!deductionSuccess) {
      return {
        success: false,
        cost,
        remainingCredits: currentCredits,
      };
    }

    // Record the usage
    await this.recordUsage({
      userId,
      operation,
      model,
      tokens,
      cost,
      metadata,
    });

    const remainingCredits = currentCredits - cost;

    return {
      success: true,
      cost,
      remainingCredits,
    };
  }

  async getUserUsageHistory(
    userId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{
    records: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      prisma.usage.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.usage.count({
        where: { userId },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      records,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async getUserUsageSummary(userId: string, days: number = 30): Promise<{
    totalTokens: number;
    totalCost: number;
    totalRequests: number;
    averageCostPerRequest: number;
    dailyAverage: number;
    modelBreakdown: Array<{
      model: string;
      tokens: number;
      cost: number;
      requests: number;
    }>;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const records = await prisma.usage.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate,
        },
      },
    });

    const totalTokens = records.reduce((sum: number, record: any) => sum + record.tokens, 0);
    const totalCost = records.reduce((sum: number, record: any) => sum + record.cost, 0);
    const totalRequests = records.length;
    const averageCostPerRequest = totalRequests > 0 ? totalCost / totalRequests : 0;
    const dailyAverage = totalCost / days;

    // Calculate model breakdown
    const modelStats = new Map<string, { tokens: number; cost: number; requests: number }>();
    
    for (const record of records) {
      const current = modelStats.get(record.model) || { tokens: 0, cost: 0, requests: 0 };
      modelStats.set(record.model, {
        tokens: current.tokens + record.tokens,
        cost: current.cost + record.cost,
        requests: current.requests + 1,
      });
    }

    const modelBreakdown = Array.from(modelStats.entries()).map(([model, stats]) => ({
      model,
      ...stats,
    }));

    return {
      totalTokens,
      totalCost,
      totalRequests,
      averageCostPerRequest,
      dailyAverage,
      modelBreakdown,
    };
  }

  async getSystemUsageStats(days: number = 7): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalTokens: number;
    totalCost: number;
    totalRequests: number;
    topModels: Array<{
      model: string;
      tokens: number;
      cost: number;
      requests: number;
    }>;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [totalUsers, records] = await Promise.all([
      prisma.user.count(),
      prisma.usage.findMany({
        where: {
          createdAt: {
            gte: startDate,
          },
        },
      }),
    ]);

    const activeUsers = new Set(records.map((r: any) => r.userId)).size;
    const totalTokens = records.reduce((sum: number, record: any) => sum + record.tokens, 0);
    const totalCost = records.reduce((sum: number, record: any) => sum + record.cost, 0);
    const totalRequests = records.length;

    // Calculate top models
    const modelStats = new Map<string, { tokens: number; cost: number; requests: number }>();
    
    for (const record of records) {
      const current = modelStats.get(record.model) || { tokens: 0, cost: 0, requests: 0 };
      modelStats.set(record.model, {
        tokens: current.tokens + record.tokens,
        cost: current.cost + record.cost,
        requests: current.requests + 1,
      });
    }

    const topModels = Array.from(modelStats.entries())
      .map(([model, stats]) => ({ model, ...stats }))
      .sort((a, b) => b.tokens - a.tokens)
      .slice(0, 10);

    return {
      totalUsers,
      activeUsers,
      totalTokens,
      totalCost,
      totalRequests,
      topModels,
    };
  }
}

export const usageService = new UsageService();