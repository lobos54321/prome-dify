import { Router } from 'express';
import { z } from 'zod';
import { authenticateToken } from '../lib/auth.js';
import { prisma } from '../db/prisma.js';
import { usageService } from '../services/usageService.js';
import { usageEstimator } from '../lib/estimation.js';
import { hashPassword } from '../lib/auth.js';
const router = Router();
const updateProfileSchema = z.object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
});
const changePasswordSchema = z.object({
    currentPassword: z.string(),
    newPassword: z.string().min(6),
});
// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
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
    }
    catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const updates = updateProfileSchema.parse(req.body);
        // Check if email is being changed and if it's already taken
        if (updates.email) {
            const existingUser = await prisma.user.findFirst({
                where: {
                    email: updates.email,
                    id: { not: req.user.id },
                },
            });
            if (existingUser) {
                return res.status(400).json({ error: 'Email already in use' });
            }
        }
        const updatedUser = await prisma.user.update({
            where: { id: req.user.id },
            data: updates,
            select: {
                id: true,
                email: true,
                name: true,
                credits: true,
                role: true,
                updatedAt: true,
            },
        });
        res.json({
            message: 'Profile updated successfully',
            user: updatedUser,
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid input', details: error.errors });
        }
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Change password
router.put('/password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
        // Get current user with password hash
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Verify current password
        const bcrypt = await import('bcryptjs');
        const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isValidPassword) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }
        // Hash new password and update
        const newPasswordHash = await hashPassword(newPassword);
        await prisma.user.update({
            where: { id: req.user.id },
            data: { passwordHash: newPasswordHash },
        });
        res.json({ message: 'Password changed successfully' });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid input', details: error.errors });
        }
        console.error('Password change error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get user credits
router.get('/credits', authenticateToken, async (req, res) => {
    try {
        const credits = await usageService.getUserCredits(req.user.id);
        res.json({ credits });
    }
    catch (error) {
        console.error('Credits fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get usage history
router.get('/usage', authenticateToken, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const usage = await usageService.getUserUsageHistory(req.user.id, page, limit);
        res.json(usage);
    }
    catch (error) {
        console.error('Usage history fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get usage summary
router.get('/usage/summary', authenticateToken, async (req, res) => {
    try {
        const days = Math.min(parseInt(req.query.days) || 30, 365);
        const summary = await usageService.getUserUsageSummary(req.user.id, days);
        res.json(summary);
    }
    catch (error) {
        console.error('Usage summary fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get usage statistics for charts/analytics
router.get('/usage/stats', authenticateToken, async (req, res) => {
    try {
        const days = Math.min(parseInt(req.query.days) || 30, 365);
        const stats = await usageEstimator.getUserUsageStats(req.user.id, days);
        res.json(stats);
    }
    catch (error) {
        console.error('Usage stats fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get user's API keys
router.get('/api-keys', authenticateToken, async (req, res) => {
    try {
        const apiKeys = await prisma.apiKey.findMany({
            where: { userId: req.user.id },
            select: {
                id: true,
                name: true,
                isActive: true,
                lastUsed: true,
                createdAt: true,
                // Don't return the actual key for security
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json({ apiKeys });
    }
    catch (error) {
        console.error('API keys fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Delete user account (soft delete)
router.delete('/account', authenticateToken, async (req, res) => {
    try {
        const { password } = z.object({ password: z.string() }).parse(req.body);
        // Get current user with password hash
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Verify password
        const bcrypt = await import('bcryptjs');
        const isValidPassword = await bcrypt.compare(password, user.passwordHash);
        if (!isValidPassword) {
            return res.status(400).json({ error: 'Password is incorrect' });
        }
        // Soft delete user account
        await prisma.user.update({
            where: { id: req.user.id },
            data: {
                isActive: false,
                email: `deleted_${Date.now()}_${user.email}`, // Prevent email conflicts
            },
        });
        // Deactivate all API keys
        await prisma.apiKey.updateMany({
            where: { userId: req.user.id },
            data: { isActive: false },
        });
        res.json({ message: 'Account deleted successfully' });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid input', details: error.errors });
        }
        console.error('Account deletion error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
export default router;
