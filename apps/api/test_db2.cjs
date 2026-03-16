const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.pipelineRun.findFirst({
    where: { status: { in: ['running', 'paused'] } },
    orderBy: { createdAt: 'desc' },
    select: { 
      id: true, 
      status: true, 
      currentStep: true, 
      steps: true,
      createdAt: true,
      updatedAt: true,
      brief: { 
        select: { 
          title: true,
          ideas: { select: { status: true } }
        } 
      }
    },
  }).then(async (active) => {
    if (active) return active;
    // If no active, return the most recent completed/failed one
    return prisma.pipelineRun.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { 
        id: true, 
        status: true, 
        currentStep: true, 
        steps: true,
        createdAt: true,
        updatedAt: true,
        brief: { 
          select: { 
            title: true,
            ideas: { select: { status: true } }
          } 
        }
      },
    });
  });
  
  console.log(JSON.stringify(result, null, 2));
}

main().finally(() => prisma.$disconnect());
