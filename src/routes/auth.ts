import { Router, Request, Response } from 'express';
import { authService } from '../services/authService';
import { authenticateToken } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();

/**
 * POST /api/auth/register - Register new user
 */
router.post('/register', async (req: Request, res: Response): Promise<Response<any>> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const result = await authService.register(email, password);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.status(201).json({
      user: result.user,
      token: result.token
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/login - Login user
 */
router.post('/login', async (req: Request, res: Response): Promise<Response<any>> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await authService.login(email, password);

    if (!result.success) {
      return res.status(401).json({ error: result.error });
    }

    return res.json({
      user: result.user,
      token: result.token
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/auth/me - Get current user info
 */
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response): Promise<Response<any>> => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return res.json({ user: req.user });
});

/**
 * POST /api/auth/logout - Logout (client-side token removal)
 */
router.post('/logout', (req: Request, res: Response) => {
  res.json({ message: 'Logged out successfully' });
});

export default router;