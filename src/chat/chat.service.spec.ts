import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import type { AIClassifier } from '../ai/interfaces/ai-classifier.interface';
import type { GeminiService } from '../ai/gemini.service';
import { GENERAL_PROMPT_V1 } from '../ai/prompts/versions/general/v1';
import { ChatService } from './chat.service';
import { MessageRole } from './enum/message.enum';

describe('ChatService', () => {
  let service: ChatService;

  const conversationRepository = {
    create: jest.fn<() => { id: string }>(),
    save: jest.fn<(conversation: { id: string }) => Promise<{ id: string }>>(),
    findOne: jest.fn<(options: unknown) => Promise<{ id: string } | null>>(),
  };

  const messageRepository = {
    create: jest.fn<() => { id: string; content?: string }>(),
    save: jest.fn<
      (message: {
        id: string;
        content?: string;
      }) => Promise<{ id: string; content?: string }>
    >(),
    find: jest.fn<
      (
        options: unknown,
      ) => Promise<Array<{ role: MessageRole; content: string }>>
    >(),
  };

  const geminiService = {
    generateReply: jest.fn<GeminiService['generateReply']>(),
  };

  const aiClassifier = {
    classify: jest.fn<AIClassifier['classify']>(),
  };

  const dataSource = {};

  beforeEach(() => {
    jest.clearAllMocks();

    service = new ChatService(
      conversationRepository as unknown as ConstructorParameters<
        typeof ChatService
      >[0],
      messageRepository as unknown as ConstructorParameters<
        typeof ChatService
      >[1],
      geminiService,
      aiClassifier,
      dataSource as unknown as ConstructorParameters<typeof ChatService>[4],
    );
  });

  it('should create a new conversation and return AI reply', async () => {
    const conversation = { id: 'conversation-1' };
    const userMessage = { id: 'user-message-1' };
    const assistantMessage = {
      id: 'assistant-message-1',
      content: 'Hello from Gemini',
    };

    conversationRepository.create.mockReturnValue(conversation);
    conversationRepository.save.mockResolvedValue(conversation);
    messageRepository.create
      .mockReturnValueOnce(userMessage)
      .mockReturnValueOnce(assistantMessage);
    messageRepository.save
      .mockResolvedValueOnce(userMessage)
      .mockResolvedValueOnce(assistantMessage);
    messageRepository.find.mockResolvedValue([
      { role: MessageRole.User, content: 'Hello' },
    ]);
    aiClassifier.classify.mockResolvedValue({
      intent: 'general',
      confidence: 0.98,
    });
    geminiService.generateReply.mockResolvedValue('Hello from Gemini');

    const result = await service.sendMessage('Hello');

    expect(conversationRepository.create).toHaveBeenCalled();
    expect(aiClassifier.classify).toHaveBeenCalledWith('Hello');
    expect(messageRepository.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        intent: 'general',
        intentConfidence: 0.98,
      }),
    );
    expect(messageRepository.save).toHaveBeenCalledTimes(2);
    expect(geminiService.generateReply).toHaveBeenCalledWith(
      [{ role: 'user', content: 'Hello' }],
      GENERAL_PROMPT_V1,
    );
    expect(messageRepository.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        promptVersion: 'general-v1',
      }),
    );
    expect(result).toEqual({
      conversationId: 'conversation-1',
      messageId: 'assistant-message-1',
      reply: 'Hello from Gemini',
    });
  });

  it('should use an existing conversation', async () => {
    const conversation = { id: 'conversation-1' };

    conversationRepository.findOne.mockResolvedValue(conversation);
    messageRepository.create
      .mockReturnValueOnce({ id: 'user-message-1' })
      .mockReturnValueOnce({ id: 'assistant-message-1', content: 'Reply' });
    messageRepository.save
      .mockResolvedValueOnce({ id: 'user-message-1' })
      .mockResolvedValueOnce({ id: 'assistant-message-1', content: 'Reply' });
    messageRepository.find.mockResolvedValue([
      { role: MessageRole.User, content: 'Previous message' },
      { role: MessageRole.Assistant, content: 'Previous reply' },
      { role: MessageRole.User, content: 'New message' },
    ]);
    aiClassifier.classify.mockResolvedValue({
      intent: 'question',
      confidence: 0.91,
    });
    geminiService.generateReply.mockResolvedValue('Reply');

    const result = await service.sendMessage('New message', 'conversation-1');

    expect(conversationRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'conversation-1' },
    });
    expect(conversationRepository.create).not.toHaveBeenCalled();
    expect(result.conversationId).toBe('conversation-1');
  });

  it('should throw NotFoundException when conversation does not exist', async () => {
    conversationRepository.findOne.mockResolvedValue(null);

    await expect(
      service.sendMessage('Hello', 'invalid-conversation-id'),
    ).rejects.toThrow(NotFoundException);

    expect(geminiService.generateReply).not.toHaveBeenCalled();
  });

  it('should propagate Gemini service errors', async () => {
    const conversation = { id: 'conversation-1' };

    conversationRepository.create.mockReturnValue(conversation);
    conversationRepository.save.mockResolvedValue(conversation);
    messageRepository.create.mockReturnValue({ id: 'user-message-1' });
    messageRepository.save.mockResolvedValue({ id: 'user-message-1' });
    messageRepository.find.mockResolvedValue([
      { role: MessageRole.User, content: 'Hello' },
    ]);
    aiClassifier.classify.mockResolvedValue({
      intent: 'general',
      confidence: 0.8,
    });
    geminiService.generateReply.mockRejectedValue(
      new ServiceUnavailableException('Gemini service is unavailable'),
    );

    await expect(service.sendMessage('Hello')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
