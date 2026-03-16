import { EventEmitter } from 'eventemitter3';
import { prisma } from '../lib/db.js';
import type { 
  AgentStateChangedPayload, 
  PipelineStepCompletedPayload, 
  DecisionRequiredPayload, 
  IdeaUpdatedPayload 
} from '@ai-office/shared-types';
import { getSocketServer } from '../plugins/socket.js';

export interface EventBusPayloads {
  'agent.state_changed': AgentStateChangedPayload;
  'pipeline.started': { pipelineId: string; type: string };
  'pipeline.step_completed': PipelineStepCompletedPayload;
  'pipeline.completed': { pipelineId: string };
  'task.created': { taskId: string; agentSlug: string; type: string };
  'task.completed': { taskId: string; agentSlug: string; summary: string };
  'task.failed': { taskId: string; agentSlug: string; error: string };
  'decision.required': DecisionRequiredPayload;
  'idea.proposed': { ideaId: string; title: string; totalScore: number };
  'idea.approved': IdeaUpdatedPayload;
  'idea.discarded': IdeaUpdatedPayload;
}

class TypedEventBus extends EventEmitter {
  async emitTyped<K extends keyof EventBusPayloads>(event: K, payload: EventBusPayloads[K]) {
    try {
      // Create a DB event
      const agentId = (payload as any).agentSlug ? await this.getAgentId((payload as any).agentSlug) : null;
      
      const dbEvent = await prisma.event.create({
        data: {
          type: event as string,
          payload: payload as unknown as object,
          agentId: agentId,
          taskId: (payload as any).taskId || null,
          pipelineRunId: (payload as any).pipelineId || null,
        }
      });
      
      // Emit locally for server logic
      (this as EventEmitter).emit(event as string, payload);

      // Broadcasting to Frontend via websocket
      try {
        const io = getSocketServer();
        io.emit('office_event', {
          id: dbEvent.id, // Using the real DB object
          type: event as string,
          payload: payload,
          timestamp: dbEvent.timestamp
        });
      } catch (wsErr) {
        // Silently fail if socket is not initialized
      }
    } catch (err) {
      console.error(`Failed to record event ${String(event)} in DB:`, err);
    }
  }

  // Cache agent UUIDs to avoid querying every time
  private agentCache = new Map<string, string>();
  private async getAgentId(slug: string): Promise<string | null> {
    if (this.agentCache.has(slug)) return this.agentCache.get(slug)!;
    const agent = await prisma.agent.findUnique({ where: { slug } });
    if (agent) {
      this.agentCache.set(slug, agent.id);
      return agent.id;
    }
    return null;
  }
}

export const eventBus = new TypedEventBus();
