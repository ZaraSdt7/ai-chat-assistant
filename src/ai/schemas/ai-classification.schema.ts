import { z } from 'zod';

export const AIClassificationSchema = z.object({
  intent: z.enum(['general', 'technical', 'question', 'unknown']),
  confidence: z.number().min(0).max(1),
});

export type AIClassificationOutput = z.infer<typeof AIClassificationSchema>;
