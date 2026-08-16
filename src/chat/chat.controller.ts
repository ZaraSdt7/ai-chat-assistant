import { Body, Controller, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { ChatDto } from './dto/chat.dto';
import { ChatService } from './chat.service';

@ApiTags('chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @ApiCreatedResponse({ description: 'Returns an AI-generated reply' })
  create(@Body() chatDto: ChatDto): Promise<{ reply: string }> {
    return this.chatService.sendMessage(
      chatDto.message,
      chatDto.conversationId,
    );
  }
}
