// Agent states
export const AgentState = {
  IDLE: 'idle',
  ASSIGNED: 'assigned',
  WORKING: 'working',
  AWAITING_REVIEW: 'awaiting_review',
  DONE: 'done',
  ERROR: 'error',
  ESCALATED: 'escalated',
} as const;
export type AgentState = (typeof AgentState)[keyof typeof AgentState];

// Task statuses
export const TaskStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  REVIEW: 'review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  COMPLETED: 'completed',
  FAILED: 'failed',
  ESCALATED: 'escalated',
} as const;
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

// Pipeline statuses
export const PipelineStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;
export type PipelineStatus = (typeof PipelineStatus)[keyof typeof PipelineStatus];

// Idea statuses
export const IdeaStatus = {
  PROPOSED: 'proposed',
  APPROVED: 'approved',
  DISCARDED: 'discarded',
} as const;
export type IdeaStatus = (typeof IdeaStatus)[keyof typeof IdeaStatus];

// Office zones — used by the visual layer
export const OfficeZone = {
  RESEARCH_LAB: 'research_lab',
  ANALYSIS_ROOM: 'analysis_room',
  CREATIVE_STUDIO: 'creative_studio',
  COMMAND_CENTER: 'command_center',
  IDLE_LOUNGE: 'idle_lounge',
  FOUNDERS_OFFICE: 'founders_office',
} as const;
export type OfficeZone = (typeof OfficeZone)[keyof typeof OfficeZone];

// Agent roles
export const AgentRole = {
  RESEARCHER: 'researcher',
  ANALYST: 'analyst',
  CREATIVE_DIRECTOR: 'creative_director',
  SUPERVISOR: 'supervisor',
} as const;
export type AgentRole = (typeof AgentRole)[keyof typeof AgentRole];

// Event types emitted on the event bus / WebSocket
export const EventType = {
  TASK_CREATED: 'task.created',
  TASK_ASSIGNED: 'task.assigned',
  TASK_COMPLETED: 'task.completed',
  TASK_FAILED: 'task.failed',
  AGENT_STATE_CHANGED: 'agent.state_changed',
  PIPELINE_STARTED: 'pipeline.started',
  PIPELINE_STEP_COMPLETED: 'pipeline.step_completed',
  PIPELINE_COMPLETED: 'pipeline.completed',
  PIPELINE_FAILED: 'pipeline.failed',
  DECISION_REQUIRED: 'decision.required',
  DECISION_RESOLVED: 'decision.resolved',
  IDEA_PROPOSED: 'idea.proposed',
  IDEA_APPROVED: 'idea.approved',
  IDEA_DISCARDED: 'idea.discarded',
} as const;
export type EventType = (typeof EventType)[keyof typeof EventType];
