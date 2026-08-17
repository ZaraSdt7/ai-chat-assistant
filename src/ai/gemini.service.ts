import {
  Injectable,
  InternalServerErrorException,
  HttpException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AIMessage } from './types/ai-message.type';

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

@Injectable()
export class GeminiService {
  private readonly apiKey: string;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY') ?? '';
    this.model =
      this.configService.get<string>('GEMINI_MODEL') ?? 'gemini-2.5-flash';
  }

  async generateReply(history: AIMessage[]): Promise<string> {
    if (!this.apiKey) {
      throw new InternalServerErrorException('Gemini API key is missing');
    }

    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/` +
      `${this.model}:generateContent?key=${this.apiKey}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: history.map((message) => ({
            role: message.role,
            parts: [
              {
                text: message.content,
              },
            ],
          })),
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();

        console.error('Gemini API Error:', {
          status: response.status,
          body: errorBody,
        });

        throw new ServiceUnavailableException(
          `Gemini API request failed with status ${response.status}`,
        );
      }

      const data = (await response.json()) as GeminiResponse;

      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (!reply) {
        throw new ServiceUnavailableException('Gemini returned an empty reply');
      }

      return reply;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      console.error('Gemini Service Error:', error);

      throw new ServiceUnavailableException('Gemini service is unavailable');
    }
  }
}
