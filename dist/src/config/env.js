import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config();
const envSchema = z.object({
    PORT: z.string().default('3000'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    DATABASE_URL: z.string(),
    JWT_SECRET: z.string(),
    JWT_EXPIRES_IN: z.string().default('7d'),
    DIFY_API_URL: z.string(),
    DIFY_API_KEY: z.string(),
    STRIPE_SECRET_KEY: z.string(),
    STRIPE_WEBHOOK_SECRET: z.string(),
    DEFAULT_COST_PER_TOKEN: z.string().default('0.1'),
    ADMIN_EMAIL: z.string().email().optional(),
    ADMIN_PASSWORD: z.string().optional(),
});
const envVars = envSchema.parse(process.env);
export const config = {
    port: parseInt(envVars.PORT, 10),
    nodeEnv: envVars.NODE_ENV,
    database: {
        url: envVars.DATABASE_URL,
    },
    jwt: {
        secret: envVars.JWT_SECRET,
        expiresIn: envVars.JWT_EXPIRES_IN,
    },
    dify: {
        apiUrl: envVars.DIFY_API_URL,
        apiKey: envVars.DIFY_API_KEY,
    },
    stripe: {
        secretKey: envVars.STRIPE_SECRET_KEY,
        webhookSecret: envVars.STRIPE_WEBHOOK_SECRET,
    },
    pricing: {
        defaultCostPerToken: parseFloat(envVars.DEFAULT_COST_PER_TOKEN),
    },
    admin: {
        email: envVars.ADMIN_EMAIL,
        password: envVars.ADMIN_PASSWORD,
    },
};
