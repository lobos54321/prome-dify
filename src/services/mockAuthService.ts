import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { mockDb } from './mockDatabase';

export interface AuthResult {
  success: boolean;
  user?: any;
  token?: string;
  error?: string;
}

export class MockAuthService {
  private readonly jwtSecret = process.env.JWT_SECRET || 'fallback-secret';

  async register(email: string, password: string): Promise<AuthResult> {
    try {
      // Check if user already exists
      const existingUser = mockDb.findUserByEmail(email);

      if (existingUser) {
        return {
          success: false,
          error: 'User already exists'
        };
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user with initial balance
      const user = mockDb.createUser(email, hashedPassword);

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
      const user = mockDb.findUserByEmail(email);

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

  async getUserById(userId: string): Promise<any | null> {
    try {
      const user = mockDb.findUserById(userId);

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

export const mockAuthService = new MockAuthService();