// Mock in-memory storage for demonstration
interface User {
  id: string;
  email: string;
  password: string;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
}

interface Conversation {
  id: string;
  userId: string;
  title?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  tokens?: number;
  createdAt: Date;
}

interface UsageEvent {
  id: string;
  userId: string;
  conversationId?: string;
  tokensUsed: number;
  balanceAfter: number;
  type: string;
  createdAt: Date;
}

interface Package {
  id: string;
  name: string;
  description: string;
  tokens: number;
  priceUsd: number;
  stripePriceId: string;
  active: boolean;
  createdAt: Date;
}

class MockDatabase {
  private users: Map<string, User> = new Map();
  private conversations: Map<string, Conversation> = new Map();
  private messages: Map<string, Message> = new Map();
  private usageEvents: Map<string, UsageEvent> = new Map();
  private packages: Map<string, Package> = new Map();

  constructor() {
    // Initialize with sample packages
    this.initializePackages();
  }

  private initializePackages() {
    const packages: Package[] = [
      {
        id: 'pkg1',
        name: 'Starter Pack',
        description: 'Perfect for light usage',
        tokens: 1000,
        priceUsd: 999,
        stripePriceId: 'price_starter_pack_test',
        active: true,
        createdAt: new Date()
      },
      {
        id: 'pkg2',
        name: 'Power User',
        description: 'Great for regular conversations',
        tokens: 5000,
        priceUsd: 3999,
        stripePriceId: 'price_power_user_test',
        active: true,
        createdAt: new Date()
      },
      {
        id: 'pkg3',
        name: 'Pro Bundle',
        description: 'Maximum value for heavy users',
        tokens: 15000,
        priceUsd: 9999,
        stripePriceId: 'price_pro_bundle_test',
        active: true,
        createdAt: new Date()
      }
    ];

    packages.forEach(pkg => this.packages.set(pkg.id, pkg));
  }

  // User operations
  createUser(email: string, password: string): User {
    const user: User = {
      id: 'user_' + Date.now(),
      email,
      password,
      balance: 1000, // Free tokens for new users
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(user.id, user);
    return user;
  }

  findUserByEmail(email: string): User | undefined {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  findUserById(id: string): User | undefined {
    return this.users.get(id);
  }

  updateUserBalance(userId: string, newBalance: number): User | undefined {
    const user = this.users.get(userId);
    if (user) {
      user.balance = newBalance;
      user.updatedAt = new Date();
      this.users.set(userId, user);
    }
    return user;
  }

  // Conversation operations
  createConversation(userId: string, title?: string): Conversation {
    const conversation: Conversation = {
      id: 'conv_' + Date.now(),
      userId,
      title: title || 'New Conversation',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.conversations.set(conversation.id, conversation);
    return conversation;
  }

  findConversation(id: string, userId: string): Conversation | undefined {
    const conversation = this.conversations.get(id);
    return conversation && conversation.userId === userId ? conversation : undefined;
  }

  getUserConversations(userId: string): Conversation[] {
    return Array.from(this.conversations.values())
      .filter(conv => conv.userId === userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  // Message operations
  createMessage(conversationId: string, role: 'user' | 'assistant', content: string, tokens?: number): Message {
    const message: Message = {
      id: 'msg_' + Date.now(),
      conversationId,
      role,
      content,
      tokens,
      createdAt: new Date()
    };
    this.messages.set(message.id, message);
    return message;
  }

  getMessages(conversationId: string): Message[] {
    return Array.from(this.messages.values())
      .filter(msg => msg.conversationId === conversationId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  // Usage event operations
  createUsageEvent(userId: string, tokensUsed: number, balanceAfter: number, conversationId?: string, type: string = 'chat'): UsageEvent {
    const usageEvent: UsageEvent = {
      id: 'usage_' + Date.now(),
      userId,
      conversationId,
      tokensUsed,
      balanceAfter,
      type,
      createdAt: new Date()
    };
    this.usageEvents.set(usageEvent.id, usageEvent);
    return usageEvent;
  }

  getUserUsageHistory(userId: string, limit: number = 50): UsageEvent[] {
    return Array.from(this.usageEvents.values())
      .filter(event => event.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  // Package operations
  getPackages(): Package[] {
    return Array.from(this.packages.values())
      .filter(pkg => pkg.active)
      .sort((a, b) => a.tokens - b.tokens);
  }

  findPackage(id: string): Package | undefined {
    return this.packages.get(id);
  }
}

export const mockDb = new MockDatabase();