import { PrismaClient } from '@prisma/client';
import { UsageEvent } from '../types';

const prisma = new PrismaClient();

export interface UsageResult {
  success: boolean;
  balance: number;
  usageEvent?: UsageEvent;
  error?: string;
}

export class UsageService {
  /**
   * Consume tokens for a user with conversation tracking
   * Returns updated balance for both successful and insufficient points cases
   */
  async consumeTokens(
    userId: string, 
    tokensToConsume: number, 
    conversationId?: string,
    type: string = 'chat'
  ): Promise<UsageResult> {
    try {
      return await prisma.$transaction(async (tx: any) => {
        // Get current user balance
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { balance: true }
        });

        if (!user) {
          return {
            success: false,
            balance: 0,
            error: 'User not found'
          };
        }

        const currentBalance = user.balance;

        // Check if user has sufficient balance
        if (currentBalance < tokensToConsume) {
          return {
            success: false,
            balance: currentBalance,
            error: 'Insufficient tokens'
          };
        }

        // Calculate new balance
        const newBalance = currentBalance - tokensToConsume;

        // Update user balance
        await tx.user.update({
          where: { id: userId },
          data: { balance: newBalance }
        });

        // Create usage event
        const usageEvent = await tx.usageEvent.create({
          data: {
            userId,
            conversationId,
            tokensUsed: tokensToConsume,
            balanceAfter: newBalance,
            type
          }
        });

        return {
          success: true,
          balance: newBalance,
          usageEvent
        };
      });
    } catch (error) {
      console.error('Error consuming tokens:', error);
      return {
        success: false,
        balance: 0,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Add tokens to user balance (for purchases)
   */
  async addTokens(userId: string, tokensToAdd: number): Promise<UsageResult> {
    try {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          balance: {
            increment: tokensToAdd
          }
        },
        select: { balance: true }
      });

      return {
        success: true,
        balance: updatedUser.balance
      };
    } catch (error) {
      console.error('Error adding tokens:', error);
      return {
        success: false,
        balance: 0,
        error: 'Failed to add tokens'
      };
    }
  }

  /**
   * Get user's current balance
   */
  async getUserBalance(userId: string): Promise<number> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { balance: true }
      });

      return user?.balance ?? 0;
    } catch (error) {
      console.error('Error getting user balance:', error);
      return 0;
    }
  }

  /**
   * Get usage history for a user
   */
  async getUserUsageHistory(userId: string, limit: number = 50): Promise<UsageEvent[]> {
    try {
      return await prisma.usageEvent.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit
      });
    } catch (error) {
      console.error('Error getting usage history:', error);
      return [];
    }
  }
}

export const usageService = new UsageService();