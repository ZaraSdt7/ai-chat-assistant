import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AI_CLASSIFIER } from './interfaces/ai-classifier.interface';
import { AI_PROVIDER } from './interfaces/ai-provider.interface';
import { GeminiClassifierService } from './gemini-classifier.service';
import { GeminiService } from './gemini.service';

@Module({
  imports: [ConfigModule],
  providers: [
    GeminiService,
    GeminiClassifierService,
    {
      provide: AI_PROVIDER,
      useExisting: GeminiService,
    },
    {
      provide: AI_CLASSIFIER,
      useExisting: GeminiClassifierService,
    },
  ],
  exports: [AI_PROVIDER, AI_CLASSIFIER],
})
export class AiModule {}
