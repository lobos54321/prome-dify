import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { prisma } from './db/prisma.js';
// Import routes
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import userRoutes from './routes/user.js';
import adminRoutes from './routes/admin.js';
import billingRoutes from './routes/billing.js';
const app = express();
// Middleware
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? ['https://your-frontend-domain.com']
        : ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
}));
// Raw body for Stripe webhooks
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));
// JSON parsing for all other routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: config.nodeEnv,
    });
});
// API routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/billing', billingRoutes);
// Root endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'prome-dify',
        version: '0.1.0',
        description: 'Dify proxy with points system and Stripe integration',
        endpoints: {
            health: '/health',
            auth: '/api/auth',
            chat: '/api/chat',
            user: '/api/user',
            admin: '/api/admin',
            billing: '/api/billing',
        },
    });
});
// Error handling middleware
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err, req, res, _next) => {
    console.error('Unhandled error:', err);
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'Invalid JSON body' });
    }
    res.status(500).json({
        error: 'Internal server error',
        ...(config.nodeEnv === 'development' && { details: err.message }),
    });
});
// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});
// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    await prisma.$disconnect();
    process.exit(0);
});
process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    await prisma.$disconnect();
    process.exit(0);
});
// Start server
const startServer = async () => {
    try {
        // Test database connection
        await prisma.$connect();
        console.log('✅ Database connected successfully');
        app.listen(config.port, () => {
            console.log(`🚀 Server running on port ${config.port}`);
            console.log(`📍 Environment: ${config.nodeEnv}`);
            console.log(`🔗 Health check: http://localhost:${config.port}/health`);
            if (config.nodeEnv === 'development') {
                console.log(`📖 API docs: http://localhost:${config.port}/`);
            }
        });
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};
startServer();
