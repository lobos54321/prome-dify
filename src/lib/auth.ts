import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config/env.js';
import { prisma } from '../db/prisma.js';
import type { Request, Response, NextFunction } from 'express';
import '../types/express.js';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn } as jwt.SignOptions);
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, config.jwt.secret) as JwtPayload;
};

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, isActive: true, credits: true }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid or inactive user' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

export const authenticateApiKey = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    const keyRecord = await prisma.apiKey.findUnique({
      where: { key: apiKey, isActive: true }
    });

    if (!keyRecord) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // Update last used timestamp
    await prisma.apiKey.update({
      where: { id: keyRecord.id },
      data: { lastUsed: new Date() }
    });

    // If userId is associated with the API key, fetch user info
    if (keyRecord.userId) {
      const user = await prisma.user.findUnique({
        where: { id: keyRecord.userId },
        select: { id: true, email: true, role: true, isActive: true, credits: true }
      });

      if (!user || !user.isActive) {
        return res.status(401).json({ error: 'Invalid or inactive user associated with API key' });
      }

      req.user = user;
    }

    req.apiKey = keyRecord;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid API key' });
  }
};

// Extend Express Request type is now in src/types/express.d.ts