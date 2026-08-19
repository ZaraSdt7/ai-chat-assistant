import {
  Inject,
  Injectable,
  InternalServerErrorException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { AI_CLASSIFIER } from '../ai/interfaces/ai-classifier.interface';
import type { AIClassifier } from '../ai/interfaces/ai-classifier.interface';
import { AI_PROVIDER } from '../ai/interfaces/ai-provider.interface';
import type { AIProvider } from '../ai/interfaces/ai-provider.interface';
import { resolveSystemPrompt } from '../ai/prompts/prompt-resolver';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { MessageRole } from './enum/message.enum';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,

    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,

    @Inject(AI_PROVIDER)
    private readonly aiProvider: AIProvider,

    @Inject(AI_CLASSIFIER)
    private readonly aiClassifier: AIClassifier,

    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async sendMessage(message: string, conversationId?: string) {
    try {
      let conversation: Conversation;

      // 1. Find existing conversation or create a new one
      if (conversationId) {
        const existingConversation = await this.conversationRepository.findOne({
          where: {
            id: conversationId,
          },
        });

        if (!existingConversation) {
          throw new NotFoundException('Conversation not found');
        }

        conversation = existingConversation;
      } else {
        conversation = this.conversationRepository.create();

        conversation = await this.conversationRepository.save(conversation);
      }

      // 2. Classify the message before persisting its AI metadata
      const classification = await this.aiClassifier.classify(message);

      console.log('AI Classification:', classification);

      const resolvedPrompt = resolveSystemPrompt(classification.intent);

      // 3. Save user's message with its classification
      const userMessage = this.messageRepository.create({
        conversation,
        role: MessageRole.User,
        content: message,
        intent: classification.intent,
        intentConfidence: classification.confidence,
      });

      await this.messageRepository.save(userMessage);

      const history = await this.getConversationHistory(conversation.id);

      const geminiHistory = history.map((item) => ({
        role:
          item.role === MessageRole.Assistant
            ? ('model' as const)
            : ('user' as const),
        content: item.content,
      }));

      // 4. Generate AI response from the persisted conversation history
      const reply = await this.aiProvider.generateReply(
        geminiHistory,
        resolvedPrompt.content,
      );

      // 5. Save assistant's response
      const assistantMessage = this.messageRepository.create({
        conversation,
        role: MessageRole.Assistant,
        content: reply,
        promptVersion: resolvedPrompt.version,
      });

      const savedAssistantMessage =
        await this.messageRepository.save(assistantMessage);

      // 6. Return response
      return {
        conversationId: conversation.id,
        messageId: savedAssistantMessage.id,
        reply: savedAssistantMessage.content,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      console.error('ChatService Error:', error);

      throw new InternalServerErrorException('Failed to process chat request');
    }
  }

  private async getConversationHistory(
    conversationId: string,
  ): Promise<Message[]> {
    return this.messageRepository.find({
      where: {
        conversation: {
          id: conversationId,
        },
      },
      order: {
        createdAt: 'ASC',
      },
    });
  }
}
