const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`ALTER TABLE "ApiKey" ADD COLUMN IF NOT EXISTS "metadata" JSONB;`);
  console.log('Added metadata column successfully.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
