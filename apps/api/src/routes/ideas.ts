import type { FastifyInstance } from 'fastify';

export async function ideasRoute(fastify: FastifyInstance) {
  // GET /api/ideas?briefId=xxx&status=proposed
  fastify.get('/ideas', async (req, reply) => {
    const { briefId, status } = req.query as { briefId?: string; status?: string };

    const ideas = await fastify.prisma.idea.findMany({
      where: {
        ...(briefId && { briefId }),
        ...(status && { status }),
      },
      orderBy: [{ totalScore: 'desc' }, { createdAt: 'desc' }],
    });

    return reply.send({ ideas });
  });

  // GET /api/ideas/:id — idea detail
  fastify.get<{ Params: { id: string } }>('/ideas/:id', async (req, reply) => {
    const idea = await fastify.prisma.idea.findUnique({ where: { id: req.params.id } });
    if (!idea) return reply.status(404).send({ error: 'Idea not found' });
    return reply.send(idea);
  });

  // POST /api/ideas/:id/approve — Matías approves manually
  fastify.post<{ Params: { id: string } }>('/ideas/:id/approve', async (req, reply) => {
    const idea = await fastify.prisma.idea.update({
      where: { id: req.params.id },
      data: { status: 'approved', approvedBy: 'human:matias' },
    });

    await fastify.prisma.auditLog.create({
      data: {
        action: 'idea_approved',
        actor: 'human:matias',
        details: { ideaId: idea.id, title: idea.title },
        resourceType: 'idea',
        resourceId: idea.id,
      },
    });

    return reply.send(idea);
  });

  // POST /api/ideas/:id/discard — Matías discards manually
  fastify.post<{ Params: { id: string }; Body: { reason?: string } }>(
    '/ideas/:id/discard',
    async (req, reply) => {
      const { reason } = (req.body ?? {}) as { reason?: string };
      const idea = await fastify.prisma.idea.update({
        where: { id: req.params.id },
        data: { status: 'discarded', approvedBy: 'human:matias', reasoning: reason ?? null },
      });

      await fastify.prisma.auditLog.create({
        data: {
          action: 'idea_discarded',
          actor: 'human:matias',
          details: { ideaId: idea.id, title: idea.title, reason },
          resourceType: 'idea',
          resourceId: idea.id,
        },
      });

      return reply.send(idea);
    },
  );
}
