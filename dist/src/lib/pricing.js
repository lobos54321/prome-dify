import { prisma } from '../db/prisma.js';
import { config } from '../config/env.js';
export const PRICING_TIERS = [
    {
        name: 'Starter',
        credits: 1000,
        price: 1000, // $10.00
    },
    {
        name: 'Pro',
        credits: 5000,
        price: 4500, // $45.00 (10% bonus)
        bonusPercent: 10,
    },
    {
        name: 'Business',
        credits: 10000,
        price: 8000, // $80.00 (20% bonus)
        bonusPercent: 20,
    },
    {
        name: 'Enterprise',
        credits: 25000,
        price: 18000, // $180.00 (28% bonus)
        bonusPercent: 28,
    },
];
export class PricingCalculator {
    modelPricing = new Map();
    constructor() {
        this.loadModelPricing();
    }
    async loadModelPricing() {
        try {
            const models = await prisma.difyModel.findMany({
                where: { isActive: true },
            });
            for (const model of models) {
                this.modelPricing.set(model.name, model.costPerToken);
            }
        }
        catch (error) {
            console.error('Error loading model pricing:', error);
        }
    }
    calculateTokenCost(modelName, tokens) {
        const costPerToken = this.modelPricing.get(modelName) || config.pricing.defaultCostPerToken;
        return Math.ceil(tokens * costPerToken);
    }
    getCostPerToken(modelName) {
        return this.modelPricing.get(modelName) || config.pricing.defaultCostPerToken;
    }
    getPricingTierByCredits(credits) {
        return PRICING_TIERS.find(tier => tier.credits === credits) || null;
    }
    calculateCreditsForPrice(priceInCents) {
        // Find the tier with the exact price or calculate based on base rate
        const tier = PRICING_TIERS.find(t => t.price === priceInCents);
        if (tier) {
            return tier.credits;
        }
        // Base calculation: $10 = 1000 credits
        const baseRate = 100; // credits per dollar
        return Math.floor((priceInCents / 100) * baseRate);
    }
    getRecommendedTier(monthlyUsage) {
        // Add 20% buffer for recommended tier
        const targetCredits = monthlyUsage * 1.2;
        for (const tier of PRICING_TIERS) {
            if (tier.credits >= targetCredits) {
                return tier;
            }
        }
        return PRICING_TIERS[PRICING_TIERS.length - 1]; // Return highest tier
    }
    async updateModelPricing(modelName, costPerToken) {
        await prisma.difyModel.upsert({
            where: { name: modelName },
            update: { costPerToken },
            create: {
                name: modelName,
                provider: 'unknown',
                costPerToken,
            },
        });
        this.modelPricing.set(modelName, costPerToken);
    }
}
export const pricingCalculator = new PricingCalculator();
