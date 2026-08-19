import type { AIClassification } from '../types/ai-classification.type';

export const AI_CLASSIFIER = Symbol('AI_CLASSIFIER');

export interface AIClassifier {
  classify(message: string): Promise<AIClassification>;
}
