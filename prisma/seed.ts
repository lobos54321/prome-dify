import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create sample token packages
  const packages = [
    {
      name: 'Starter Pack',
      description: 'Perfect for light usage',
      tokens: 1000,
      priceUsd: 999, // $9.99
      stripePriceId: 'price_starter_pack_test',
      active: true
    },
    {
      name: 'Power User',
      description: 'Great for regular conversations',
      tokens: 5000,
      priceUsd: 3999, // $39.99
      stripePriceId: 'price_power_user_test',
      active: true
    },
    {
      name: 'Pro Bundle',
      description: 'Maximum value for heavy users',
      tokens: 15000,
      priceUsd: 9999, // $99.99
      stripePriceId: 'price_pro_bundle_test',
      active: true
    }
  ]

  for (const pkg of packages) {
    const created = await prisma.package.upsert({
      where: { stripePriceId: pkg.stripePriceId },
      update: pkg,
      create: pkg
    })
    console.log(`📦 Created package: ${created.name}`)
  }

  console.log('✅ Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })