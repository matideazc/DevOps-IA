import type { FastifyInstance } from 'fastify';
import { TriggerPipelineSchema, CREATIVE_PIPELINE_STEPS } from '@ai-office/shared-types';

export async function pipelinesRoute(fastify: FastifyInstance) {
  // POST /api/pipelines/trigger — start a new creative pipeline
  fastify.post('/pipelines/trigger', async (req, reply) => {
    const parsed = TriggerPipelineSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parsed.error.issues });
    }

    const { brief: briefData } = parsed.data;

    // Create pipeline run
    const pipeline = await fastify.prisma.pipelineRun.create({
      data: {
        type: 'creative_flow',
        triggerType: 'manual',
        triggerData: briefData,
        status: 'pending',
        steps: CREATIVE_PIPELINE_STEPS,
        context: {},
      },
    });

    // Create the brief linked to this pipeline
    await fastify.prisma.brief.create({
      data: {
        title: briefData.title,
        content: briefData.content,
        objectives: briefData.objectives,
        targetAudience: briefData.targetAudience ?? null,
        tone: briefData.tone ?? null,
        pipelineRunId: pipeline.id,
      },
    });

    // Log creation
    await fastify.prisma.auditLog.create({
      data: {
        action: 'pipeline_triggered',
        actor: 'human:matias',
        details: { type: 'creative_flow', briefTitle: briefData.title },
        resourceType: 'pipeline',
        resourceId: pipeline.id,
      },
    });

    // Start background mock execution
    import('../services/pipeline-runner.js').then(({ runCreativePipeline }) => {
      runCreativePipeline(pipeline.id).catch(err => {
        fastify.log.error(`Pipeline execution failed: ${err}`);
      });
    });

    return reply.status(201).send({
      id: pipeline.id,
      type: pipeline.type,
      status: pipeline.status,
      currentStep: pipeline.currentStep,
      steps: pipeline.steps,
      createdAt: pipeline.createdAt,
    });
  });

  // GET /api/pipelines — list pipelines (newest first)
  fastify.get('/pipelines', async (req, reply) => {
    const pipelines = await fastify.prisma.pipelineRun.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        type: true,
        status: true,
        currentStep: true,
        steps: true,
        createdAt: true,
        completedAt: true,
        brief: { select: { title: true } },
      },
    });

    return reply.send({ pipelines });
  });

  // GET /api/pipelines/:id — pipeline detail with tasks
  fastify.get<{ Params: { id: string } }>('/pipelines/:id', async (req, reply) => {
    const { id } = req.params;
    const pipeline = await fastify.prisma.pipelineRun.findUnique({
      where: { id },
      include: {
        brief: true,
        tasks: { orderBy: { createdAt: 'asc' } },
        decisions: true,
      },
    });

    if (!pipeline) {
      return reply.status(404).send({ error: 'Pipeline not found' });
    }

    return reply.send(pipeline);
  });

  // GET /api/pipelines/:id/events — event timeline for a pipeline
  fastify.get<{ Params: { id: string } }>('/pipelines/:id/events', async (req, reply) => {
    const events = await fastify.prisma.event.findMany({
      where: { pipelineRunId: req.params.id },
      orderBy: { timestamp: 'asc' },
    });

    return reply.send({ events });
  });

  // GET /api/office/state — snapshot for the office UI on load
  fastify.get('/office/state', async (_req, reply) => {
    const [agents, activePipeline, recentEvents, pendingDecisions] = await Promise.all([
      fastify.prisma.agent.findMany({
        orderBy: { name: 'asc' },
        select: {
          slug: true,
          name: true,
          role: true,
          currentState: true,
          currentZone: true,
          tasks: {
            where: { status: 'in_progress' },
            select: { id: true, title: true },
            take: 1,
          },
        },
      }),
      fastify.prisma.pipelineRun.findFirst({
        where: { status: { in: ['running', 'paused'] } },
        orderBy: { createdAt: 'desc' },
        select: { id: true, status: true, currentStep: true, steps: true },
      }).then(async (active: { id: string; status: string; currentStep: number; steps: any; } | null) => {
        if (active) return active;
        // If no active, return the most recent completed/failed one
        return fastify.prisma.pipelineRun.findFirst({
          orderBy: { createdAt: 'desc' },
          select: { id: true, status: true, currentStep: true, steps: true },
        });
      }),
      fastify.prisma.event.findMany({
        orderBy: { timestamp: 'desc' },
        take: 20,
        select: { id: true, type: true, payload: true, timestamp: true },
      }),
      fastify.prisma.humanDecision.count({ where: { decision: null } }),
    ]);

    return reply.send({
      agents: agents.map((a: any) => ({
        slug: a.slug,
        name: a.name,
        role: a.role,
        state: a.currentState,
        zone: a.currentZone ?? null,
        currentTaskTitle: a.tasks[0]?.title ?? null,
      })),
      activePipeline,
      recentEvents: recentEvents.reverse(),
      pendingDecisions,
    });
  });
}
