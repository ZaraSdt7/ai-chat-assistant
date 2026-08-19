import { describe, expect, it } from '@jest/globals';

import { CHAT_SYSTEM_PROMPT } from './chat.prompt';
import { resolveSystemPrompt } from './prompt-resolver';
import { GENERAL_PROMPT_V1 } from './versions/general/v1';
import { QUESTION_PROMPT_V1 } from './versions/question/v1';
import { TECHNICAL_PROMPT_V1 } from './versions/technical/v1';

describe('resolveSystemPrompt', () => {
  it.each([
    ['general', 'general-v1', GENERAL_PROMPT_V1],
    ['technical', 'technical-v1', TECHNICAL_PROMPT_V1],
    ['question', 'question-v1', QUESTION_PROMPT_V1],
    ['unknown', 'chat-v1', CHAT_SYSTEM_PROMPT],
  ] as const)(
    'resolves %s to its versioned prompt',
    (intent, version, content) => {
      expect(resolveSystemPrompt(intent)).toEqual({ version, content });
    },
  );
});
