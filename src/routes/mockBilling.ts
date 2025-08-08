import { Router, Request, Response } from 'express';
import { mockDb } from '../services/mockDatabase';
import { mockAuthenticateToken } from '../middleware/mockAuth';
import { AuthRequest } from '../types';
import { mockUsageService } from '../services/mockUsageService';

const router = Router();

/**
 * GET /api/billing/packages - Get available token packages
 */
router.get('/packages', async (req: Request, res: Response) => {
  try {
    const packages = mockDb.getPackages();
    res.json({ packages });
  } catch (error) {
    console.error('Error fetching packages:', error);
    res.status(500).json({ error: 'Failed to fetch packages' });
  }
});

/**
 * POST /api/billing/checkout - Create Stripe checkout session (mock)
 */
router.post('/checkout', mockAuthenticateToken, async (req: AuthRequest, res: Response): Promise<Response<any>> => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { packageId } = req.body as { packageId: string };

    if (!packageId) {
      return res.status(400).json({ error: 'Package ID is required' });
    }

    // Get package details
    const package_ = mockDb.findPackage(packageId);

    if (!package_) {
      return res.status(404).json({ error: 'Package not found' });
    }

    // In a real app, this would create a Stripe session
    // For demo purposes, we'll simulate adding tokens directly
    const result = await mockUsageService.addTokens(req.user.id, package_.tokens);
    
    if (result.success) {
      return res.json({ 
        url: '/billing?success=true&demo=true',
        message: `Successfully added ${package_.tokens} tokens to your account!`
      });
    } else {
      return res.status(500).json({ error: 'Failed to add tokens' });
    }
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

/**
 * GET /api/billing/balance - Get user's current token balance
 */
router.get('/balance', mockAuthenticateToken, async (req: AuthRequest, res: Response): Promise<Response<any>> => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const balance = await mockUsageService.getUserBalance(req.user.id);
    return res.json({ balance });
  } catch (error) {
    console.error('Error getting balance:', error);
    return res.status(500).json({ error: 'Failed to get balance' });
  }
});

/**
 * GET /api/billing/usage - Get user's usage history
 */
router.get('/usage', mockAuthenticateToken, async (req: AuthRequest, res: Response): Promise<Response<any>> => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const usage = await mockUsageService.getUserUsageHistory(req.user.id, limit);
    return res.json({ usage });
  } catch (error) {
    console.error('Error getting usage history:', error);
    return res.status(500).json({ error: 'Failed to get usage history' });
  }
});

export default router;