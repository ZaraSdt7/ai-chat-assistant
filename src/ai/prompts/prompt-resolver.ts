import type { AIIntent } from '../types/ai-intent.type';

import { CHAT_SYSTEM_PROMPT } from './chat.prompt';
import { GENERAL_PROMPT_V1 } from './versions/general/v1';
import { QUESTION_PROMPT_V1 } from './versions/question/v1';
import { TECHNICAL_PROMPT_V1 } from './versions/technical/v1';

export interface ResolvedPrompt {
  version: string;
  content: string;
}

export function resolveSystemPrompt(intent: AIIntent): ResolvedPrompt {
  switch (intent) {
    case 'technical':
      return {
        version: 'technical-v1',
        content: TECHNICAL_PROMPT_V1,
      };
    case 'question':
      return {
        version: 'question-v1',
        content: QUESTION_PROMPT_V1,
      };
    case 'general':
      return {
        version: 'general-v1',
        content: GENERAL_PROMPT_V1,
      };
    case 'unknown':
    default:
      return {
        version: 'chat-v1',
        content: CHAT_SYSTEM_PROMPT,
      };
  }
}
