import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Inline the 4 agents so this seed runs with tsx without needing a build step
const AGENTS = [
  { slug: 'nora',   name: 'Nora — Investigación',       role: 'researcher',        description: 'Investiga tendencias, competencia y movimientos de mercado', config: { allowedTools: ['web_search', 'analyze_social_media', 'read_reports'], forbiddenTools: ['generate_content', 'publish', 'schedule'], maxBudgetPerRun: 0.30, maxSteps: 8 } },
  { slug: 'bruno',  name: 'Bruno — Análisis',            role: 'analyst',           description: 'Analiza contenido, patrones, hooks y rendimiento',            config: { allowedTools: ['analyze_metrics', 'extract_hooks', 'compare_formats'], forbiddenTools: ['generate_content', 'publish', 'web_search'], maxBudgetPerRun: 0.30, maxSteps: 8 } },
  { slug: 'bianca', name: 'Bianca — Directora Creativa', role: 'creative_director', description: 'Sintetiza investigación + análisis y genera propuestas originales',  config: { allowedTools: ['generate_ideas', 'score_idea', 'adapt_tone', 'create_outline'], forbiddenTools: ['web_search', 'publish', 'analyze_metrics'], maxBudgetPerRun: 0.50, maxSteps: 10 } },
  { slug: 'alfred', name: 'Alfred — Supervisor',         role: 'supervisor',        description: 'Supervisa calidad, filtra ideas y escala lo importante a Matías', config: { allowedTools: ['approve_idea', 'discard_idea', 'escalate_to_human'], forbiddenTools: ['generate_ideas', 'web_search', 'publish'], maxBudgetPerRun: 0.20, maxSteps: 6 } },
];

function calcTotalScore(scores: Record<string, number>): number {
  const values = Object.values(scores);
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}


async function main() {
  console.log('🌱 Seeding database...');

  // ── 1. Agents ─────────────────────────────────────────
  for (const def of AGENTS) {
    await prisma.agent.upsert({
      where: { slug: def.slug },
      update: {},
      create: {
        slug: def.slug,
        name: def.name,
        role: def.role,
        description: def.description,
        config: def.config,
        currentState: 'idle',
        currentZone: 'idle_lounge',
      },
    });
    console.log(`  ✓ Agent: ${def.name}`);
  }


  // ── 2. Demo pipeline (completed) ──────────────────────
  const pipeline = await prisma.pipelineRun.create({
    data: {
      type: 'creative_flow',
      triggerType: 'manual',
      triggerData: {},
      status: 'completed',
      currentStep: 4,
      steps: [
        { order: 0, agentSlug: 'nora',   agentRole: 'researcher',        status: 'completed' },
        { order: 1, agentSlug: 'bruno',  agentRole: 'analyst',           status: 'completed' },
        { order: 2, agentSlug: 'bianca', agentRole: 'creative_director', status: 'completed' },
        { order: 3, agentSlug: 'alfred', agentRole: 'supervisor',        status: 'completed' },
      ],
      context: {},
      completedAt: new Date(),
    },
  });
  console.log(`  ✓ PipelineRun: ${pipeline.id}`);

  // ── 3. Brief ──────────────────────────────────────────
  const brief = await prisma.brief.create({
    data: {
      title: 'Demo — Campaña Q2',
      content: 'Queremos generar 5 piezas de contenido para posicionar nuestra herramienta...',
      objectives: ['awareness', 'engagement'],
      targetAudience: 'founders y CTOs, 28-45 años',
      tone: 'profesional pero cercano, con datos',
      pipelineRunId: pipeline.id,
    },
  });
  console.log(`  ✓ Brief: ${brief.title}`);

  // ── 4. Ideation task (for linking ideas) ──────────────
  const biancaAgent = await prisma.agent.findUniqueOrThrow({ where: { slug: 'bianca' } });
  const ideationTask = await prisma.task.create({
    data: {
      type: 'ideation',
      title: 'Bianca — Generación de ideas (demo)',
      description: 'Tarea de demostración con ideas precargadas',
      status: 'completed',
      input: {},
      output: {},
      pipelineRunId: pipeline.id,
      assignedTo: biancaAgent.id,
      completedAt: new Date(),
    },
  });

  // ── 5. Sample ideas ───────────────────────────────────
  const sampleIdeas = [
    {
      title: 'El ROI invisible de no automatizar',
      concept: 'Mostrar con datos cuánto pierden las startups que evitan automatizar procesos repetitivos.',
      hook: '¿Cuántas horas perdés por semana sin darte cuenta?',
      format: 'carousel',
      scores: { hook_engagement: 5, data_backed: 4, originality: 4, brand_voice: 5, production_ease: 4 },
      status: 'approved',
      approvedBy: 'agent:alfred',
      reasoning: 'Score 4.4/5 — hook claro, respaldado por datos de Nora y Bruno.',
    },
    {
      title: 'Cómo los mejores CTOs de LATAM toman decisiones rápidas',
      concept: 'Entrevistar o citar patrones de decisión de CTOs exitosos en la región.',
      hook: 'No es suerte. Es un framework que podés replicar.',
      format: 'video',
      scores: { hook_engagement: 4, data_backed: 4, originality: 3, brand_voice: 4, production_ease: 3 },
      status: 'approved',
      approvedBy: 'agent:alfred',
      reasoning: 'Score 3.6/5 — sobre umbral. Buena autoridad y relevancia.',
    },
    {
      title: 'El stack de un equipo de 2 que rinde como 10',
      concept: 'Exponer el stack real de herramientas de un micro-equipo altamente productivo.',
      hook: '2 personas. 10x output. Acá está el secreto.',
      format: 'thread',
      scores: { hook_engagement: 5, data_backed: 3, originality: 4, brand_voice: 5, production_ease: 5 },
      status: 'approved',
      approvedBy: 'agent:alfred',
      reasoning: 'Score 4.4/5 — muy compartible, hook fuerte.',
    },
    {
      title: '3 tools que nadie te recomienda pero todos usan',
      concept: 'Lista genérica de herramientas sin diferenciación clara.',
      hook: 'Dejá de usar lo mismo que todos.',
      format: 'reel',
      scores: { hook_engagement: 3, data_backed: 2, originality: 2, brand_voice: 3, production_ease: 5 },
      status: 'discarded',
      approvedBy: 'agent:alfred',
      reasoning: 'Score 3.0/5 — bajo umbral 3.5. Hook genérico, datos insuficientes, baja originalidad.',
    },
    {
      title: 'Por qué el 80% de los proyectos de IA fallan',
      concept: 'Análisis de causas de fracaso de proyectos de IA en startups.',
      hook: 'No fallaron por la tecnología.',
      format: 'blog',
      scores: { hook_engagement: 4, data_backed: 2, originality: 3, brand_voice: 4, production_ease: 2 },
      status: 'discarded',
      approvedBy: 'agent:alfred',
      reasoning: 'Score 3.0/5 — bajo umbral. Datos insuficientes y producción compleja.',
    },
  ] as const;

  for (const idea of sampleIdeas) {
    const totalScore = calcTotalScore(idea.scores);
    await prisma.idea.create({
      data: {
        ...idea,
        scores: idea.scores,
        totalScore,
        briefId: brief.id,
        taskId: ideationTask.id,
      },
    });
    console.log(`  ✓ Idea: "${idea.title}" (${totalScore}/5 — ${idea.status})`);
  }

  // ── 6. Sample audit log ───────────────────────────────
  await prisma.auditLog.create({
    data: {
      action: 'pipeline_triggered',
      actor: 'human:matias',
      details: { type: 'creative_flow', briefTitle: brief.title },
      resourceType: 'pipeline',
      resourceId: pipeline.id,
    },
  });

  console.log('\n✅ Seed completo.');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
