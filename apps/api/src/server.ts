import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { prismaPlugin } from './plugins/prisma.js';
import { agentsRoute } from './routes/agents.js';
import { pipelinesRoute } from './routes/pipelines.js';
import { ideasRoute } from './routes/ideas.js';
import { decisionsRoute } from './routes/decisions.js';
import { healthRoute } from './routes/health.js';
import { initSocket } from './plugins/socket.js';

const server = Fastify({
  logger: {
    level: process.env['LOG_LEVEL'] ?? 'info',
  },
});

await server.register(cors, { origin: true });
await server.register(prismaPlugin);

// Routes
await server.register(healthRoute, { prefix: '/api' });
await server.register(agentsRoute, { prefix: '/api' });
await server.register(pipelinesRoute, { prefix: '/api' });
await server.register(ideasRoute, { prefix: '/api' });
await server.register(decisionsRoute, { prefix: '/api' });

// Start
const port = Number(process.env['PORT'] ?? 3001);
try {
  initSocket(server);
  await server.listen({ port, host: '0.0.0.0' });
  console.log(`🚀 AI Office API running on http://localhost:${port}`);
} catch (err) {
  server.log.error(err);
  process.exit(1);
}
