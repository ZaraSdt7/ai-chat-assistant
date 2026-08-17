import {
  Injectable,
  InternalServerErrorException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { GeminiService } from '../ai/gemini.service';
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

    private readonly geminiService: GeminiService,

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

      // 2. Save user's message
      const userMessage = this.messageRepository.create({
        conversation,
        role: MessageRole.User,
        content: message,
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

      // 3. Generate AI response from the persisted conversation history
      const reply = await this.geminiService.generateReply(geminiHistory);

      // 4. Save assistant's response
      const assistantMessage = this.messageRepository.create({
        conversation,
        role: MessageRole.Assistant,
        content: reply,
      });

      const savedAssistantMessage =
        await this.messageRepository.save(assistantMessage);

      // 5. Return response
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
