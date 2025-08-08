import { Router } from 'express';
import { z } from 'zod';
import { authenticateToken, requireAdmin } from '../lib/auth.js';
import { prisma } from '../db/prisma.js';
import { usageService } from '../services/usageService.js';
import { pricingCalculator } from '../lib/pricing.js';

const router = Router();

// Apply admin authentication to all routes
router.use(authenticateToken, requireAdmin);

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1).optional(),
  role: z.enum(['USER', 'ADMIN']).default('USER'),
  credits: z.number().int().min(0).default(1000),
});

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
  role: z.enum(['USER', 'ADMIN']).optional(),
  credits: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

const creditAdjustmentSchema = z.object({
  amount: z.number().int(),
  reason: z.string().min(1),
});

const modelSchema = z.object({
  name: z.string().min(1),
  provider: z.string().min(1),
  costPerToken: z.number().min(0),
  maxTokens: z.number().int().positive().optional(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

// Get system statistics
router.get('/stats', async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days as string) || 7, 365);
    
    const [systemStats, totalUsers, activeUsers] = await Promise.all([
      usageService.getSystemUsageStats(days),
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
    ]);

    res.json({
      ...systemStats,
      totalUsers,
      activeUsers,
      period: `${days} days`,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all users with pagination
router.get('/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const search = req.query.search as string;
    const isActive = req.query.isActive;

    const skip = (page - 1) * limit;
    
    const where: any = {};
    
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          credits: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              usageRecords: true,
              payments: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Users fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific user details
router.get('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        usageRecords: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            usageRecords: true,
            payments: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('User fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new user
router.post('/users', async (req, res) => {
  try {
    const userData = createUserSchema.parse(req.body);

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Hash password
    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.hash(userData.password, 12);

    const user = await prisma.user.create({
      data: {
        ...userData,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        name: true,
        credits: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      message: 'User created successfully',
      user,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('User creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user
router.put('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = updateUserSchema.parse(req.body);

    // Check if email is being changed and if it's already taken
    if (updates.email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email: updates.email,
          id: { not: userId },
        },
      });

      if (existingUser) {
        return res.status(400).json({ error: 'Email already in use' });
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updates,
      select: {
        id: true,
        email: true,
        name: true,
        credits: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    res.json({
      message: 'User updated successfully',
      user,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('User update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Adjust user credits
router.post('/users/:userId/credits', async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount, reason } = creditAdjustmentSchema.parse(req.body);

    if (amount > 0) {
      await usageService.addCredits(userId, amount);
    } else {
      const success = await usageService.deductCredits(userId, Math.abs(amount));
      if (!success) {
        return res.status(400).json({ error: 'Insufficient credits to deduct' });
      }
    }

    // Log the adjustment (you might want to create a credit_adjustments table)
    await prisma.usage.create({
      data: {
        userId,
        operation: 'credit_adjustment',
        model: 'admin',
        tokens: 0,
        cost: -amount, // Negative for additions, positive for deductions
        metadata: {
          reason,
          adjustedBy: req.user!.id,
        },
      },
    });

    const newCredits = await usageService.getUserCredits(userId);

    res.json({
      message: 'Credits adjusted successfully',
      newCredits,
      adjustment: amount,
      reason,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Credit adjustment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all models
router.get('/models', async (req, res) => {
  try {
    const models = await prisma.difyModel.findMany({
      orderBy: { name: 'asc' },
    });

    res.json({ models });
  } catch (error) {
    console.error('Models fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create or update model
router.post('/models', async (req, res) => {
  try {
    const modelData = modelSchema.parse(req.body);

    const model = await prisma.difyModel.upsert({
      where: { name: modelData.name },
      update: modelData,
      create: modelData,
    });

    // Update pricing calculator
    await pricingCalculator.updateModelPricing(model.name, model.costPerToken);

    res.status(201).json({
      message: 'Model saved successfully',
      model,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Model save error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete model
router.delete('/models/:modelId', async (req, res) => {
  try {
    const { modelId } = req.params;

    await prisma.difyModel.delete({
      where: { id: modelId },
    });

    res.json({ message: 'Model deleted successfully' });
  } catch (error) {
    console.error('Model deletion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all API keys (system-wide)
router.get('/api-keys', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const skip = (page - 1) * limit;

    const [apiKeys, total] = await Promise.all([
      prisma.apiKey.findMany({
        include: {
          user: {
            select: {
              email: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.apiKey.count(),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      apiKeys,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('API keys fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Revoke API key
router.delete('/api-keys/:keyId', async (req, res) => {
  try {
    const { keyId } = req.params;

    await prisma.apiKey.update({
      where: { id: keyId },
      data: { isActive: false },
    });

    res.json({ message: 'API key revoked successfully' });
  } catch (error) {
    console.error('API key revocation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;