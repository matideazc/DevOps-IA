import { z } from 'zod';

// Scores on each of the 5 criteria
export const IdeaScoresSchema = z.object({
  hook_engagement: z.number().int().min(1).max(5),
  data_backed: z.number().int().min(1).max(5),
  originality: z.number().int().min(1).max(5),
  brand_voice: z.number().int().min(1).max(5),
  production_ease: z.number().int().min(1).max(5),
});
export type IdeaScores = z.infer<typeof IdeaScoresSchema>;

// Output schema Bianca must return
export const IdeaOutputSchema = z.object({
  title: z.string().min(1).max(120),
  concept: z.string().min(1).max(300),
  hook: z.string().min(1).max(150),
  format: z.enum(['reel', 'carousel', 'blog', 'video', 'thread']),
  scores: IdeaScoresSchema,
});
export type IdeaOutput = z.infer<typeof IdeaOutputSchema>;

export const BiancaOutputSchema = z.object({
  ideas: z.array(IdeaOutputSchema).length(5),
});
export type BiancaOutput = z.infer<typeof BiancaOutputSchema>;

// Ideas approved/discarded by Alfred
export const AlfredVerdictSchema = z.object({
  approved: z.array(z.string()),  // idea titles or ids
  discarded: z.array(z.object({
    title: z.string(),
    reason: z.string(),
  })),
  escalate_to_human: z.array(z.object({
    title: z.string(),
    reason: z.string(),
  })).default([]),
});
export type AlfredVerdict = z.infer<typeof AlfredVerdictSchema>;

// Minimum score to approve an idea
export const IDEA_APPROVAL_THRESHOLD = 3.5;

export function calcTotalScore(scores: IdeaScores): number {
  const values = Object.values(scores);
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}
