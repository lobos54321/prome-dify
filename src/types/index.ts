export interface User {
  id: string;
  email: string;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Conversation {
  id: string;
  userId: string;
  title?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  tokens?: number;
  createdAt: Date;
}

export interface UsageEvent {
  id: string;
  userId: string;
  conversationId?: string;
  tokensUsed: number;
  balanceAfter: number;
  type: string;
  createdAt: Date;
}

export interface Package {
  id: string;
  name: string;
  description: string;
  tokens: number;
  priceUsd: number;
  stripePriceId: string;
  active: boolean;
  createdAt: Date;
}

import { Request } from 'express';

export interface AuthRequest extends Request {
  user?: User;
}

export interface SSEEvent {
  event: string;
  data: any;
}

export interface ChatMetaEvent {
  conversation_id: string;
}

export interface ChatUsageEvent {
  conversationId: string;
  tokensUsed: number;
  balanceAfter: number;
}

export interface ChatAnswerEvent {
  content: string;
  finished?: boolean;
}

export interface ChatErrorEvent {
  error: string;
}