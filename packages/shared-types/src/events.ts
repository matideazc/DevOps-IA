import type { AgentState, OfficeZone } from './enums.js';

// Payloads for events emitted over Socket.IO to the office UI
export interface AgentStateChangedPayload {
  agentSlug: string;
  previousState: AgentState;
  newState: AgentState;
  zone: OfficeZone | null;
  taskId: string | null;
  timestamp: string; // ISO-8601
}

export interface PipelineStepCompletedPayload {
  pipelineId: string;
  step: number;
  agentSlug: string;
  summary: string;
  timestamp: string;
}

export interface DecisionRequiredPayload {
  decisionId: string;
  question: string;
  options: string[];
  requestedBy: string;
  urgency: 'low' | 'medium' | 'high';
  timestamp: string;
}

export interface IdeaUpdatedPayload {
  ideaId: string;
  title: string;
  status: string;
  totalScore: number | null;
  timestamp: string;
}

// Union for all WS events (discriminated on `type`)
export type WSEvent =
  | { type: 'agent:state_changed';      data: AgentStateChangedPayload }
  | { type: 'pipeline:step_completed';  data: PipelineStepCompletedPayload }
  | { type: 'decision:required';        data: DecisionRequiredPayload }
  | { type: 'idea:updated';             data: IdeaUpdatedPayload };
