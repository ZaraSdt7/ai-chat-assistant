import type { AIMessage } from '../types/ai-message.type';

export const AI_PROVIDER = Symbol('AI_PROVIDER');

export interface AIProvider {
  generateReply(history: AIMessage[], systemPrompt?: string): Promise<string>;
}
