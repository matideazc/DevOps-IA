const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const pipelines = await prisma.pipelineRun.findMany({
    orderBy: { createdAt: 'desc' },
    take: 2,
    include: {
      brief: {
        include: { ideas: true }
      }
    }
  });
  console.log(JSON.stringify(pipelines, null, 2));
}

main().finally(() => prisma.$disconnect());
