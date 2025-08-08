import { Router } from 'express';
import { z } from 'zod';
import Stripe from 'stripe';
import { authenticateToken } from '../lib/auth.js';
import { prisma } from '../db/prisma.js';
import { usageService } from '../services/usageService.js';
import { PRICING_TIERS, pricingCalculator } from '../lib/pricing.js';
import { config } from '../config/env.js';
const router = Router();
const stripe = new Stripe(config.stripe.secretKey);
const createPaymentIntentSchema = z.object({
    credits: z.number().int().min(100),
    tier: z.string().optional(),
});
const confirmPaymentSchema = z.object({
    paymentIntentId: z.string(),
});
// Get pricing tiers
router.get('/pricing', (req, res) => {
    res.json({
        tiers: PRICING_TIERS,
        customPricing: {
            baseRate: 100, // credits per dollar
            minimumPurchase: 100, // minimum credits
        },
    });
});
// Create payment intent
router.post('/create-payment-intent', authenticateToken, async (req, res) => {
    try {
        const { credits, tier } = createPaymentIntentSchema.parse(req.body);
        let amount;
        let description;
        if (tier) {
            const pricingTier = PRICING_TIERS.find(t => t.name === tier);
            if (!pricingTier) {
                return res.status(400).json({ error: 'Invalid pricing tier' });
            }
            amount = pricingTier.price;
            description = `${pricingTier.name} - ${pricingTier.credits} credits`;
        }
        else {
            // Custom amount based on credits
            amount = Math.ceil(credits / 100) * 100; // $1 per 100 credits, rounded up
            description = `${credits} credits`;
        }
        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency: 'usd',
            metadata: {
                userId: req.user.id,
                credits: credits.toString(),
                tier: tier || 'custom',
            },
            description,
        });
        // Create payment record
        await prisma.payment.create({
            data: {
                userId: req.user.id,
                stripePaymentId: paymentIntent.id,
                amount,
                creditsGranted: credits,
                status: 'PENDING',
                metadata: {
                    tier,
                    description,
                },
            },
        });
        res.json({
            clientSecret: paymentIntent.client_secret,
            amount,
            credits,
            description,
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid input', details: error.errors });
        }
        console.error('Payment intent creation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Confirm payment and add credits
router.post('/confirm-payment', authenticateToken, async (req, res) => {
    try {
        const { paymentIntentId } = confirmPaymentSchema.parse(req.body);
        // Retrieve payment intent from Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (paymentIntent.metadata.userId !== req.user.id) {
            return res.status(403).json({ error: 'Payment does not belong to current user' });
        }
        if (paymentIntent.status !== 'succeeded') {
            return res.status(400).json({ error: 'Payment not completed' });
        }
        // Find payment record
        const payment = await prisma.payment.findUnique({
            where: { stripePaymentId: paymentIntentId },
        });
        if (!payment) {
            return res.status(404).json({ error: 'Payment record not found' });
        }
        if (payment.status === 'COMPLETED') {
            return res.status(400).json({ error: 'Payment already processed' });
        }
        // Update payment status and add credits
        await prisma.$transaction(async (tx) => {
            // Update payment status
            await tx.payment.update({
                where: { id: payment.id },
                data: { status: 'COMPLETED' },
            });
            // Add credits to user
            await tx.user.update({
                where: { id: req.user.id },
                data: {
                    credits: {
                        increment: payment.creditsGranted,
                    },
                },
            });
        });
        const newCredits = await usageService.getUserCredits(req.user.id);
        res.json({
            message: 'Payment confirmed and credits added',
            creditsAdded: payment.creditsGranted,
            totalCredits: newCredits,
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid input', details: error.errors });
        }
        console.error('Payment confirmation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Stripe webhook handler
router.post('/webhook', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    try {
        const event = stripe.webhooks.constructEvent(req.body, sig, config.stripe.webhookSecret);
        switch (event.type) {
            case 'payment_intent.succeeded':
                await handlePaymentSucceeded(event.data.object);
                break;
            case 'payment_intent.payment_failed':
                await handlePaymentFailed(event.data.object);
                break;
            default:
                console.log(`Unhandled event type: ${event.type}`);
        }
        res.json({ received: true });
    }
    catch (error) {
        console.error('Webhook error:', error);
        res.status(400).json({ error: 'Webhook signature verification failed' });
    }
});
async function handlePaymentSucceeded(paymentIntent) {
    try {
        const payment = await prisma.payment.findUnique({
            where: { stripePaymentId: paymentIntent.id },
        });
        if (!payment || payment.status === 'COMPLETED') {
            return; // Already processed or not found
        }
        await prisma.$transaction(async (tx) => {
            // Update payment status
            await tx.payment.update({
                where: { id: payment.id },
                data: { status: 'COMPLETED' },
            });
            // Add credits to user
            await tx.user.update({
                where: { id: payment.userId },
                data: {
                    credits: {
                        increment: payment.creditsGranted,
                    },
                },
            });
        });
        console.log(`Payment succeeded: ${paymentIntent.id}, credits added: ${payment.creditsGranted}`);
    }
    catch (error) {
        console.error('Error handling payment success:', error);
    }
}
async function handlePaymentFailed(paymentIntent) {
    try {
        await prisma.payment.update({
            where: { stripePaymentId: paymentIntent.id },
            data: { status: 'FAILED' },
        });
        console.log(`Payment failed: ${paymentIntent.id}`);
    }
    catch (error) {
        console.error('Error handling payment failure:', error);
    }
}
// Get user's payment history
router.get('/payments', authenticateToken, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 50);
        const skip = (page - 1) * limit;
        const [payments, total] = await Promise.all([
            prisma.payment.findMany({
                where: { userId: req.user.id },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.payment.count({
                where: { userId: req.user.id },
            }),
        ]);
        const totalPages = Math.ceil(total / limit);
        res.json({
            payments,
            pagination: {
                page,
                limit,
                total,
                totalPages,
            },
        });
    }
    catch (error) {
        console.error('Payment history fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get payment by ID
router.get('/payments/:paymentId', authenticateToken, async (req, res) => {
    try {
        const { paymentId } = req.params;
        const payment = await prisma.payment.findFirst({
            where: {
                id: paymentId,
                userId: req.user.id,
            },
        });
        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        res.json({ payment });
    }
    catch (error) {
        console.error('Payment fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Calculate custom pricing
router.post('/calculate-price', (req, res) => {
    try {
        const { credits } = z.object({ credits: z.number().int().min(100) }).parse(req.body);
        const price = pricingCalculator.calculateCreditsForPrice(credits);
        const recommendedTier = pricingCalculator.getRecommendedTier(credits);
        res.json({
            credits,
            price,
            priceUsd: price / 100,
            recommendedTier,
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid input', details: error.errors });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get billing summary
router.get('/summary', authenticateToken, async (req, res) => {
    try {
        const [currentCredits, totalSpent, totalCreditsEarned, lastPayment] = await Promise.all([
            usageService.getUserCredits(req.user.id),
            prisma.payment.aggregate({
                where: {
                    userId: req.user.id,
                    status: 'COMPLETED',
                },
                _sum: { amount: true },
            }),
            prisma.payment.aggregate({
                where: {
                    userId: req.user.id,
                    status: 'COMPLETED',
                },
                _sum: { creditsGranted: true },
            }),
            prisma.payment.findFirst({
                where: {
                    userId: req.user.id,
                    status: 'COMPLETED',
                },
                orderBy: { createdAt: 'desc' },
            }),
        ]);
        res.json({
            currentCredits,
            totalSpentCents: totalSpent._sum.amount || 0,
            totalSpentUsd: (totalSpent._sum.amount || 0) / 100,
            totalCreditsEarned: totalCreditsEarned._sum.creditsGranted || 0,
            lastPayment,
        });
    }
    catch (error) {
        console.error('Billing summary fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
export default router;
