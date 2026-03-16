import { z } from 'zod';

// Brief (input to the creative pipeline)
export const TriggerBriefSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(10),
  objectives: z.array(z.string()).min(1),
  targetAudience: z.string().optional(),
  tone: z.string().optional(),
});
export type TriggerBrief = z.infer<typeof TriggerBriefSchema>;

// Each step in the pipeline steps array (stored as JSONB in PipelineRun)
export const PipelineStepSchema = z.object({
  order: z.number().int().min(0),
  agentRole: z.string(),
  agentSlug: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'skipped']),
});
export type PipelineStep = z.infer<typeof PipelineStepSchema>;

// POST /api/pipelines/trigger request body
export const TriggerPipelineSchema = z.object({
  type: z.literal('creative_flow'),
  brief: TriggerBriefSchema,
});
export type TriggerPipelineInput = z.infer<typeof TriggerPipelineSchema>;

// The fixed step order for the creative pipeline
export const CREATIVE_PIPELINE_STEPS: PipelineStep[] = [
  { order: 0, agentRole: 'researcher',        agentSlug: 'nora',   status: 'pending' },
  { order: 1, agentRole: 'analyst',           agentSlug: 'bruno',  status: 'pending' },
  { order: 2, agentRole: 'creative_director', agentSlug: 'bianca', status: 'pending' },
  { order: 3, agentRole: 'supervisor',        agentSlug: 'alfred', status: 'pending' },
];
