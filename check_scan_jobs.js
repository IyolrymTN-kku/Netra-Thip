const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const jobs = await prisma.scanJob.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' }
  });
  jobs.forEach(j => {
    console.log(`Job ${j.id}:`);
    console.log(JSON.stringify(j.parameters, null, 2));
  });
}
main().catch(console.error).finally(() => prisma.$disconnect());
