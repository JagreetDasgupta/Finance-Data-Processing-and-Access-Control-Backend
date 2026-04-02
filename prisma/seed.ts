import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_ROLES = [
  { name: 'viewer' },
  { name: 'analyst' },
  { name: 'admin' },
] as const;

async function main(): Promise<void> {
  console.log('Seeding database...');

  for (const role of DEFAULT_ROLES) {
    const result = await prisma.role.upsert({
      where:  { name: role.name },
      update: {},
      create: { name: role.name },
    });
    console.log(`  Role "${result.name}" ready (id: ${result.id})`);
  }

  console.log('Seed complete.');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
