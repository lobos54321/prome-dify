import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { AuthRequest } from '../types';

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response<any> | void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = await authService.verifyToken(token);
    if (!decoded) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    const user = await authService.getUserById(decoded.userId);
    if (!user) {
      return res.status(403).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};