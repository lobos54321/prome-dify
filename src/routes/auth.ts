import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { hashPassword, comparePassword, generateToken, authenticateToken } from '../lib/auth.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = registerSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        credits: 1000, // Default credits for new users
      },
      select: {
        id: true,
        email: true,
        name: true,
        credits: true,
        role: true,
        createdAt: true,
      },
    });

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.status(201).json({
      message: 'User created successfully',
      user,
      token,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        credits: user.credits,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        credits: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ user });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Refresh token
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    const token = generateToken({
      userId: req.user!.id,
      email: req.user!.email,
      role: req.user!.role,
    });

    res.json({ token });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate API key
router.post('/api-key', authenticateToken, async (req, res) => {
  try {
    const { name } = z.object({ name: z.string().min(1) }).parse(req.body);

    // Generate a unique API key
    const apiKey = `pk_${Buffer.from(`${req.user!.id}:${Date.now()}:${Math.random()}`).toString('base64')}`;

    const keyRecord = await prisma.apiKey.create({
      data: {
        key: apiKey,
        name,
        userId: req.user!.id,
      },
      select: {
        id: true,
        key: true,
        name: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      message: 'API key created successfully',
      apiKey: keyRecord,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('API key creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List user's API keys
router.get('/api-keys', authenticateToken, async (req, res) => {
  try {
    const apiKeys = await prisma.apiKey.findMany({
      where: { userId: req.user!.id },
      select: {
        id: true,
        name: true,
        isActive: true,
        lastUsed: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ apiKeys });
  } catch (error) {
    console.error('API keys fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Revoke API key
router.delete('/api-key/:keyId', authenticateToken, async (req, res) => {
  try {
    const { keyId } = req.params;

    await prisma.apiKey.update({
      where: {
        id: keyId,
        userId: req.user!.id,
      },
      data: {
        isActive: false,
      },
    });

    res.json({ message: 'API key revoked successfully' });
  } catch (error) {
    console.error('API key revocation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;