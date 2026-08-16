import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class ChatDto {
  @ApiProperty({
    example: 'What is NestJS?',
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  message!: string;

  @IsOptional()
  @IsUUID()
  conversationId?: string;
}
