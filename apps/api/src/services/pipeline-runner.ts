import { prisma } from '../lib/db.js';
import { eventBus } from './event-bus.js';
import { executeAgentMock } from './mock-agents.js';
import { calcTotalScore, IdeaScores } from '@ai-office/shared-types';
import type { AgentState, OfficeZone } from '@ai-office/shared-types';

const ROLE_ZONE_MAP: Record<string, OfficeZone> = {
  researcher: 'research_lab',
  analyst: 'analysis_room',
  creative_director: 'creative_studio',
  supervisor: 'command_center',
};

async function updateAgentState(slug: string, state: AgentState, zone: OfficeZone, taskId: string | null = null) {
  const agent = await prisma.agent.findUnique({ where: { slug } });
  if (!agent) return;

  const previousState = agent.currentState as AgentState;
  
  await prisma.agent.update({
    where: { slug },
    data: {
      currentState: state,
      currentZone: zone,
    },
  });

  await eventBus.emitTyped('agent.state_changed', {
    agentSlug: slug,
    previousState,
    newState: state,
    zone,
    taskId,
    timestamp: new Date().toISOString(),
  });
}

export async function runCreativePipeline(pipelineId: string) {
  try {
    const pipeline = await prisma.pipelineRun.findUnique({
      where: { id: pipelineId },
      include: { brief: true }
    });
    
    if (!pipeline || !pipeline.brief) {
      console.error(`Pipeline ${pipelineId} or brief not found`);
      return;
    }

    if (pipeline.status !== 'pending' && pipeline.status !== 'running') {
      console.log(`Pipeline ${pipelineId} is in status ${pipeline.status}, skipping.`);
      return;
    }

    if (pipeline.status === 'pending') {
      await prisma.pipelineRun.update({
        where: { id: pipelineId },
        data: { status: 'running' }
      });
      await eventBus.emitTyped('pipeline.started', { pipelineId, type: pipeline.type });
    }

    // Explicit generic type for db json to object conversion
    const steps = pipeline.steps as unknown as any[];
    let context = (pipeline.context || {}) as Record<string, any>;
    context.brief = pipeline.brief;

    for (let i: number = pipeline.currentStep; i < steps.length; i++) {
      const step = steps[i];
      
      const agent = await prisma.agent.findUnique({ where: { slug: step.agentSlug } });
      if (!agent) throw new Error(`Agent ${step.agentSlug} not found`);

      // 1. Create a task
      const taskType = step.agentRole === 'researcher' ? 'research' :
                       step.agentRole === 'analyst' ? 'analysis' :
                       step.agentRole === 'creative_director' ? 'ideation' : 'supervision';

      const task = await prisma.task.create({
        data: {
          type: taskType,
          title: `${agent.name} — Paso ${step.order + 1}`,
          description: `Ejecutando paso ${step.order + 1} del pipeline ${pipelineId}`,
          input: context,
          pipelineRunId: pipelineId,
          assignedTo: agent.id,
          status: 'in_progress',
        }
      });

      await eventBus.emitTyped('task.created', { taskId: task.id, agentSlug: step.agentSlug, type: taskType });

      // 2. Set Agent state to working
      const zone = ROLE_ZONE_MAP[step.agentRole] || 'idle_lounge';
      await updateAgentState(step.agentSlug, 'working', zone, task.id);

      // 3. Execute mock agent
      try {
        const output = await executeAgentMock(step.agentSlug, context);

        // 4. Update task completion
        await prisma.task.update({
          where: { id: task.id },
          data: {
            status: 'completed',
            output: output,
            completedAt: new Date()
          }
        });

        // Save output to pipeline context
        context[`${step.agentSlug}_output`] = output;
        await prisma.pipelineRun.update({
          where: { id: pipelineId },
          data: { context: context }
        });

        await eventBus.emitTyped('task.completed', { taskId: task.id, agentSlug: step.agentSlug, summary: 'Task executed successfully' });

        // 5. Special handlers per role
        if (step.agentRole === 'creative_director') {
          for (const idea of output.ideas) {
            const totalScore = calcTotalScore(idea.scores as IdeaScores);
            const savedIdea = await prisma.idea.create({
              data: {
                title: idea.title,
                concept: idea.concept,
                hook: idea.hook,
                format: idea.format,
                scores: idea.scores,
                totalScore,
                briefId: pipeline.brief.id,
                taskId: task.id
              }
            });
            await eventBus.emitTyped('idea.proposed', { 
              ideaId: savedIdea.id, 
              title: idea.title, 
              totalScore 
            });
          }
        }

        if (step.agentRole === 'supervisor') {
          const ideas = await prisma.idea.findMany({ where: { briefId: pipeline.brief.id } });
          
          for (const approvedTitle of output.approved) {
            const idea = ideas.find((i: any) => i.title === approvedTitle);
            if (idea) {
              await prisma.idea.update({
                where: { id: idea.id },
                data: { status: 'approved', approvedBy: 'agent:alfred' }
              });
              await eventBus.emitTyped('idea.approved', { 
                ideaId: idea.id, title: idea.title, status: 'approved', totalScore: idea.totalScore, timestamp: new Date().toISOString() 
              });
            }
          }

          for (const discarded of output.discarded) {
            const idea = ideas.find((i: any) => i.title === discarded.title);
            if (idea) {
              await prisma.idea.update({
                where: { id: idea.id },
                data: { status: 'discarded', approvedBy: 'agent:alfred', reasoning: discarded.reason }
              });
              await eventBus.emitTyped('idea.discarded', { 
                ideaId: idea.id, title: idea.title, status: 'discarded', totalScore: idea.totalScore, timestamp: new Date().toISOString() 
              });
            }
          }

          if (output.escalate_to_human && output.escalate_to_human.length > 0) {
            for (const escalation of output.escalate_to_human) {
              const decision = await prisma.humanDecision.create({
                data: {
                  question: `Decisión solicitada sobre la idea: "${escalation.title}". Razón: ${escalation.reason}`,
                  options: ['Aprobar', 'Rechazar', 'Modificar'],
                  requestedBy: 'agent:alfred',
                  taskId: task.id,
                  pipelineRunId: pipeline.id,
                }
              });

              await eventBus.emitTyped('decision.required', {
                decisionId: decision.id,
                question: decision.question,
                options: decision.options as string[],
                requestedBy: decision.requestedBy,
                urgency: 'high',
                timestamp: new Date().toISOString()
              });
            }

            // Pause pipeline
            await prisma.pipelineRun.update({
              where: { id: pipelineId },
              data: { status: 'paused', currentStep: i + 1 } // Stop here
            });

            await updateAgentState(step.agentSlug, 'idle', 'idle_lounge', null);
            return; // Exit execution loop
          }
        }

        // 6. Update step and mark agent idle
        await prisma.pipelineRun.update({
          where: { id: pipelineId },
          data: { currentStep: i + 1 }
        });

        await updateAgentState(step.agentSlug, 'idle', 'idle_lounge', null);
        
        await eventBus.emitTyped('pipeline.step_completed', {
          pipelineId,
          step: i,
          agentSlug: step.agentSlug,
          summary: `Step ${i} completed by ${step.agentSlug}`,
          timestamp: new Date().toISOString()
        });

      } catch (err: any) {
        console.error(`Error executing agent ${step.agentSlug}:`, err);
        
        await prisma.task.update({
          where: { id: task.id },
          data: { status: 'failed' }
        });
        
        await eventBus.emitTyped('task.failed', { taskId: task.id, agentSlug: step.agentSlug, error: err.message });
        
        await updateAgentState(step.agentSlug, 'error', 'idle_lounge', null);

        await prisma.pipelineRun.update({
          where: { id: pipelineId },
          data: { status: 'failed', currentStep: i }
        });
        return; // Halt pipeline
      }
    }

    // Finished all steps
    await prisma.pipelineRun.update({
      where: { id: pipelineId },
      data: { status: 'completed', completedAt: new Date() }
    });

    await eventBus.emitTyped('pipeline.completed', { pipelineId });

  } catch (err) {
    console.error(`Fatal error inside pipeline runner for ${pipelineId}:`, err);
  }
}
