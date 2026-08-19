import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AIClassifier } from './interfaces/ai-classifier.interface';
import { AIClassificationSchema } from './schemas/ai-classification.schema';
import type { AIClassification } from './types/ai-classification.type';

type GeminiClassificationResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

@Injectable()
export class GeminiClassifierService implements AIClassifier {
  constructor(private readonly configService: ConfigService) {}

  async classify(message: string): Promise<AIClassification> {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY') ?? '';
    const model =
      this.configService.get<string>('GEMINI_MODEL') ?? 'gemini-2.5-flash';

    if (!apiKey) {
      throw new InternalServerErrorException('Gemini API key is missing');
    }

    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/` +
      `${model}:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `
Classify the following user message.

Allowed intents:
- general
- technical
- question
- unknown

Return ONLY valid JSON.

Format:
{
  "intent": "technical",
  "confidence": 0.95
}

User message:
${message}
                  `.trim(),
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();

        console.error('Gemini Classification Error:', {
          status: response.status,
          body: errorBody,
        });

        throw new ServiceUnavailableException(
          'Gemini classification request failed',
        );
      }

      const data = (await response.json()) as GeminiClassificationResponse;
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (!text) {
        throw new ServiceUnavailableException(
          'Gemini returned an empty classification',
        );
      }

      const cleanedText = text
        .replace(/^```json\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      const parsed: unknown = JSON.parse(cleanedText);
      const validationResult = AIClassificationSchema.safeParse(parsed);

      if (!validationResult.success) {
        console.error(
          'Invalid AI classification:',
          validationResult.error.issues,
        );

        throw new ServiceUnavailableException(
          'Invalid AI classification response',
        );
      }

      return validationResult.data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      console.error('AI Classification Error:', error);

      throw new ServiceUnavailableException(
        'AI classification service is unavailable',
      );
    }
  }
}
