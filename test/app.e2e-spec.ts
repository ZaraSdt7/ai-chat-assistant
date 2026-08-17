import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';

import { AppModule } from './../src/app.module';
import { GeminiService } from './../src/ai/gemini.service';

describe('Chat API (e2e)', () => {
  let app: INestApplication;

  const geminiMock = {
    generateReply: jest
      .fn<GeminiService['generateReply']>()
      .mockResolvedValue('Mocked Gemini response'),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GeminiService)
      .useValue(geminiMock)
      .compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterEach(() => {
    jest.clearAllMocks();
    geminiMock.generateReply.mockResolvedValue('Mocked Gemini response');
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /chat should reject empty message', async () => {
    await request(app.getHttpServer() as Server)
      .post('/chat')
      .send({ message: '' })
      .expect(400);
  });

  it('POST /chat should reject unknown fields', async () => {
    await request(app.getHttpServer() as Server)
      .post('/chat')
      .send({ message: 'Hello', unknownField: 'invalid' })
      .expect(400);
  });

  it('POST /chat should create a conversation and return AI response', async () => {
    const response = await request(app.getHttpServer() as Server)
      .post('/chat')
      .send({ message: 'Hello' })
      .expect(201);
    const responseBody = response.body as {
      conversationId: string;
      messageId: string;
      reply: string;
    };

    expect(responseBody.conversationId).toBeDefined();
    expect(responseBody.messageId).toBeDefined();
    expect(responseBody.reply).toBe('Mocked Gemini response');
    expect(geminiMock.generateReply).toHaveBeenCalled();
  });
});
