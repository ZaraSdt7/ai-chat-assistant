import type { AIIntent } from './ai-intent.type';

export interface AIClassification {
  intent: AIIntent;
  confidence: number;
}
