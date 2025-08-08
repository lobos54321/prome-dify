import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../types';

const prisma = new PrismaClient();

export interface AuthResult {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
}

export class AuthService {
  private readonly jwtSecret = process.env.JWT_SECRET || 'fallback-secret';

  async register(email: string, password: string): Promise<AuthResult> {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        return {
          success: false,
          error: 'User already exists'
        };
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user with initial balance
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          balance: 1000 // Give new users 1000 tokens to start
        }
      });

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        this.jwtSecret,
        { expiresIn: '7d' }
      );

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          balance: user.balance,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        token
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: 'Failed to create user'
      };
    }
  }

  async login(email: string, password: string): Promise<AuthResult> {
    try {
      // Find user
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        return {
          success: false,
          error: 'Invalid credentials'
        };
      }

      // Verify password
      const validPassword = await bcrypt.compare(password, user.password);

      if (!validPassword) {
        return {
          success: false,
          error: 'Invalid credentials'
        };
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        this.jwtSecret,
        { expiresIn: '7d' }
      );

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          balance: user.balance,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        token
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Login failed'
      };
    }
  }

  async verifyToken(token: string): Promise<{ userId: string; email: string } | null> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      return {
        userId: decoded.userId,
        email: decoded.email
      };
    } catch (error) {
      return null;
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) return null;

      return {
        id: user.id,
        email: user.email,
        balance: user.balance,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }
}

export const authService = new AuthService();