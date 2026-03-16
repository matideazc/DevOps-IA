import type { FastifyInstance } from 'fastify';

export async function decisionsRoute(fastify: FastifyInstance) {
  // GET /api/decisions/pending — decisions waiting for Matías
  fastify.get('/decisions/pending', async (_req, reply) => {
    const decisions = await fastify.prisma.humanDecision.findMany({
      where: { decision: null },
      orderBy: { createdAt: 'asc' },
      include: {
        pipelineRun: { select: { id: true, type: true } },
        task: { select: { id: true, title: true } },
      },
    });

    return reply.send({ decisions });
  });

  // POST /api/decisions/:id/resolve — Matías makes a decision
  fastify.post<{
    Params: { id: string };
    Body: { decision: string; decidedBy?: string; comment?: string };
  }>('/decisions/:id/resolve', async (req, reply) => {
    const { decision, decidedBy = 'human:matias', comment } = req.body;

    const updated = await fastify.prisma.humanDecision.update({
      where: { id: req.params.id },
      data: { decision, decidedBy, decidedAt: new Date() },
    });

    await fastify.prisma.auditLog.create({
      data: {
        action: 'decision_resolved',
        actor: decidedBy,
        details: { decisionId: updated.id, decision, question: updated.question, comment },
        resourceType: 'pipeline',
        resourceId: updated.pipelineRunId ?? updated.id,
      },
    });

    // Notify all clients to trigger a state resync
    const { getSocketServer } = await import('../plugins/socket.js');
    try {
      getSocketServer().emit('office_event', {
        id: crypto.randomUUID(),
        type: 'decision.resolved',
        payload: { decisionId: updated.id, decision },
        timestamp: new Date().toISOString()
      });
    } catch {}

    return reply.send(updated);
  });

  // GET /api/decisions — full history
  fastify.get('/decisions', async (_req, reply) => {
    const decisions = await fastify.prisma.humanDecision.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return reply.send({ decisions });
  });
}
