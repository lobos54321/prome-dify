import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { config } from '../src/config/env.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  try {
    // Create default Dify models
    const models = [
      {
        name: 'gpt-3.5-turbo',
        provider: 'openai',
        costPerToken: 0.002,
        maxTokens: 4096,
        description: 'GPT-3.5 Turbo - Fast and efficient for most tasks',
      },
      {
        name: 'gpt-4',
        provider: 'openai',
        costPerToken: 0.03,
        maxTokens: 8192,
        description: 'GPT-4 - Most capable model for complex reasoning',
      },
      {
        name: 'gpt-4-turbo',
        provider: 'openai',
        costPerToken: 0.01,
        maxTokens: 128000,
        description: 'GPT-4 Turbo - Latest GPT-4 with larger context window',
      },
      {
        name: 'claude-3-haiku',
        provider: 'anthropic',
        costPerToken: 0.00025,
        maxTokens: 200000,
        description: 'Claude 3 Haiku - Fast and lightweight',
      },
      {
        name: 'claude-3-sonnet',
        provider: 'anthropic',
        costPerToken: 0.003,
        maxTokens: 200000,
        description: 'Claude 3 Sonnet - Balanced performance',
      },
      {
        name: 'claude-3-opus',
        provider: 'anthropic',
        costPerToken: 0.015,
        maxTokens: 200000,
        description: 'Claude 3 Opus - Most intelligent model',
      },
    ];

    console.log('Creating default models...');
    for (const model of models) {
      await prisma.difyModel.upsert({
        where: { name: model.name },
        update: model,
        create: model,
      });
      console.log(`✅ Created/updated model: ${model.name}`);
    }

    // Create admin user if admin credentials are provided
    if (config.admin.email && config.admin.password) {
      console.log('Creating admin user...');
      
      const passwordHash = await bcrypt.hash(config.admin.password, 12);
      
      const adminUser = await prisma.user.upsert({
        where: { email: config.admin.email },
        update: {
          role: 'ADMIN',
          isActive: true,
        },
        create: {
          email: config.admin.email,
          passwordHash,
          name: 'Admin User',
          role: 'ADMIN',
          credits: 10000, // Give admin user more credits
        },
      });
      
      console.log(`✅ Created/updated admin user: ${adminUser.email}`);
    }

    // Create some sample API keys for testing (only in development)
    if (config.nodeEnv === 'development') {
      console.log('Creating development API keys...');
      
      // Create a test user if it doesn't exist
      const testUser = await prisma.user.upsert({
        where: { email: 'test@example.com' },
        update: {},
        create: {
          email: 'test@example.com',
          passwordHash: await bcrypt.hash('password123', 12),
          name: 'Test User',
          credits: 5000,
        },
      });

      // Create API key for test user
      await prisma.apiKey.upsert({
        where: { key: 'pk_test_dev_key_12345' },
        update: {
          isActive: true,
          userId: testUser.id,
        },
        create: {
          key: 'pk_test_dev_key_12345',
          name: 'Development Test Key',
          userId: testUser.id,
        },
      });

      console.log('✅ Created development API key: pk_test_dev_key_12345');
    }

    console.log('🎉 Database seed completed successfully!');
    
    // Print summary
    const [userCount, modelCount, apiKeyCount] = await Promise.all([
      prisma.user.count(),
      prisma.difyModel.count(),
      prisma.apiKey.count(),
    ]);

    console.log('\n📊 Database Summary:');
    console.log(`👥 Users: ${userCount}`);
    console.log(`🤖 Models: ${modelCount}`);
    console.log(`🔑 API Keys: ${apiKeyCount}`);
    
  } catch (error) {
    console.error('❌ Error during seed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });