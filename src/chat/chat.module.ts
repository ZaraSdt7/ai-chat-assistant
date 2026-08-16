import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../ai/ai.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';

@Module({
  imports: [AiModule, TypeOrmModule.forFeature([Conversation, Message])],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
