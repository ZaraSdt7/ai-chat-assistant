import { Body, Controller, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { ChatDto } from './dto/chat.dto';
import { ChatResponseDto } from './dto/chat-response.dto';
import { ChatService } from './chat.service';

@ApiTags('chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @ApiCreatedResponse({
    description: 'Returns an AI-generated reply',
    type: ChatResponseDto,
  })
  async create(@Body() chatDto: ChatDto): Promise<ChatResponseDto> {
    return this.chatService.sendMessage(
      chatDto.message,
      chatDto.conversationId,
    );
  }
}
