const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const jobs = await prisma.scanJob.findMany({
    where: { status: 'RUNNING' }
  });
  console.log(`Found ${jobs.length} RUNNING jobs.`);
  
  for (const job of jobs) {
    await prisma.scanJob.update({
      where: { id: job.id },
      data: { status: 'FAILED' }
    });
    console.log(`Updated job ${job.id} to FAILED.`);
    
    // Attempt to notify
    const fullJob = await prisma.scanJob.findUnique({ where: { id: job.id }, include: { project: true } });
    if (fullJob.project?.userId) {
      await prisma.notification.create({
        data: {
          userId: fullJob.project.userId,
          title: "Scan Job Failed",
          message: `Scan job ${fullJob.toolName} failed (cleanup).`,
          type: "error"
        }
      });
      console.log(`Created notification for user ${fullJob.project.userId}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
