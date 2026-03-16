import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/db.js';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: typeof prisma;
  }
}

async function prismaPlugin(fastify: FastifyInstance) {
  await prisma.$connect();
  fastify.decorate('prisma', prisma);

  fastify.addHook('onClose', async () => {
    await prisma.$disconnect();
  });
}

export default fp(prismaPlugin, { name: 'prisma' });
export { prismaPlugin };
