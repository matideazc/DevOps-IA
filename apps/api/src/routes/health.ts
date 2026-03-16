import type { FastifyInstance } from 'fastify';

export async function healthRoute(fastify: FastifyInstance) {
  fastify.get('/health', async (_req, reply) => {
    // Verify DB is reachable
    try {
      await fastify.prisma.$queryRaw`SELECT 1`;
      return reply.send({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
    } catch {
      return reply.status(503).send({ status: 'error', db: 'disconnected' });
    }
  });
}
