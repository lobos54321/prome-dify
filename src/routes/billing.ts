import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import { authenticateToken } from '../middleware/auth';
import { AuthRequest } from '../types';
import { usageService } from '../services/usageService';

const router = Router();
const prisma = new PrismaClient();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16'
});

/**
 * GET /api/billing/packages - Get available token packages
 */
router.get('/packages', async (req: Request, res: Response) => {
  try {
    const packages = await prisma.package.findMany({
      where: { active: true },
      orderBy: { tokens: 'asc' }
    });

    res.json({ packages });
  } catch (error) {
    console.error('Error fetching packages:', error);
    res.status(500).json({ error: 'Failed to fetch packages' });
  }
});

/**
 * POST /api/billing/checkout - Create Stripe checkout session
 */
router.post('/checkout', authenticateToken, async (req: AuthRequest, res: Response): Promise<Response<any>> => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { packageId } = req.body as { packageId: string };

    if (!packageId) {
      return res.status(400).json({ error: 'Package ID is required' });
    }

    // Get package details
    const package_ = await prisma.package.findUnique({
      where: { id: packageId, active: true }
    });

    if (!package_) {
      return res.status(404).json({ error: 'Package not found' });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: package_.stripePriceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers['origin'] || 'http://localhost:3001'}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers['origin'] || 'http://localhost:3001'}/billing?canceled=true`,
      metadata: {
        userId: req.user.id,
        packageId: package_.id,
        tokens: package_.tokens.toString()
      }
    });

    return res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

/**
 * POST /api/billing/webhook - Stripe webhook handler
 */
router.post('/webhook', async (req: Request, res: Response): Promise<Response<any>> => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('Stripe webhook secret not configured');
    return res.status(400).json({ error: 'Webhook secret not configured' });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      if (session.metadata && session.metadata.userId && session.metadata.tokens) {
        const { userId, tokens } = session.metadata;
        const tokensToAdd = parseInt(tokens);

        // Add tokens to user balance
        const result = await usageService.addTokens(userId, tokensToAdd);
        
        if (result.success) {
          console.log(`Added ${tokensToAdd} tokens to user ${userId}`);
        } else {
          console.error(`Failed to add tokens to user ${userId}:`, result.error);
        }
      }
    }

    return res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * GET /api/billing/balance - Get user's current token balance
 */
router.get('/balance', authenticateToken, async (req: AuthRequest, res: Response): Promise<Response<any>> => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const balance = await usageService.getUserBalance(req.user.id);
    return res.json({ balance });
  } catch (error) {
    console.error('Error getting balance:', error);
    return res.status(500).json({ error: 'Failed to get balance' });
  }
});

/**
 * GET /api/billing/usage - Get user's usage history
 */
router.get('/usage', authenticateToken, async (req: AuthRequest, res: Response): Promise<Response<any>> => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const usage = await usageService.getUserUsageHistory(req.user.id, limit);
    return res.json({ usage });
  } catch (error) {
    console.error('Error getting usage history:', error);
    return res.status(500).json({ error: 'Failed to get usage history' });
  }
});

export default router;