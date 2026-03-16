import type { FastifyInstance } from 'fastify';

export async function agentsRoute(fastify: FastifyInstance) {
  // GET /api/agents — list all agents with current state
  fastify.get('/agents', async (_req, reply) => {
    const agents = await fastify.prisma.agent.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        slug: true,
        name: true,
        role: true,
        description: true,
        currentState: true,
        currentZone: true,
        tasks: {
          where: { status: 'in_progress' },
          select: { id: true, title: true },
          take: 1,
        },
      },
    });

    return reply.send({
      agents: agents.map((a: any) => ({
        id: a.id,
        slug: a.slug,
        name: a.name,
        role: a.role,
        description: a.description,
        state: a.currentState,
        zone: a.currentZone ?? null,
        currentTaskId: a.tasks[0]?.id ?? null,
        currentTaskTitle: a.tasks[0]?.title ?? null,
      })),
    });
  });

  // GET /api/agents/:slug — single agent detail
  fastify.get<{ Params: { slug: string } }>('/agents/:slug', async (req, reply) => {
    const { slug } = req.params;
    const agent = await fastify.prisma.agent.findUnique({
      where: { slug },
      include: {
        tasks: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { id: true, title: true, type: true, status: true, createdAt: true },
        },
      },
    });

    if (!agent) {
      return reply.status(404).send({ error: 'Agent not found', slug });
    }

    return reply.send(agent);
  });
}
