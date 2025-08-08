import { mockDb } from './mockDatabase';

export interface UsageResult {
  success: boolean;
  balance: number;
  usageEvent?: any;
  error?: string;
}

export class MockUsageService {
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
      // Get current user balance
      const user = mockDb.findUserById(userId);

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
      mockDb.updateUserBalance(userId, newBalance);

      // Create usage event
      const usageEvent = mockDb.createUsageEvent(
        userId,
        tokensToConsume,
        newBalance,
        conversationId,
        type
      );

      return {
        success: true,
        balance: newBalance,
        usageEvent
      };
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
      const user = mockDb.findUserById(userId);
      if (!user) {
        return {
          success: false,
          balance: 0,
          error: 'User not found'
        };
      }

      const newBalance = user.balance + tokensToAdd;
      mockDb.updateUserBalance(userId, newBalance);

      return {
        success: true,
        balance: newBalance
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
      const user = mockDb.findUserById(userId);
      return user?.balance ?? 0;
    } catch (error) {
      console.error('Error getting user balance:', error);
      return 0;
    }
  }

  /**
   * Get usage history for a user
   */
  async getUserUsageHistory(userId: string, limit: number = 50): Promise<any[]> {
    try {
      return mockDb.getUserUsageHistory(userId, limit);
    } catch (error) {
      console.error('Error getting usage history:', error);
      return [];
    }
  }
}

export const mockUsageService = new MockUsageService();