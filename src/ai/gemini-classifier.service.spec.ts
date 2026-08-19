import { InternalServerErrorException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

import { GeminiClassifierService } from './gemini-classifier.service';

describe('GeminiClassifierService', () => {
  let service: GeminiClassifierService;
  let fetchMock: jest.SpiedFunction<typeof fetch>;

  const configService = {
    get: jest.fn<(key: string) => string | undefined>(),
  };

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    configService.get.mockImplementation((key) => {
      if (key === 'GEMINI_API_KEY') {
        return 'test-api-key';
      }

      if (key === 'GEMINI_MODEL') {
        return 'test-model';
      }

      return undefined;
    });

    fetchMock = jest.spyOn(global, 'fetch');
    service = new GeminiClassifierService(
      configService as unknown as ConfigService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns a valid classification and sends the expected request', async () => {
    fetchMock.mockResolvedValue(
      createResponse({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    intent: 'technical',
                    confidence: 0.95,
                  }),
                },
              ],
            },
          },
        ],
      }),
    );

    await expect(
      service.classify('What is dependency injection in NestJS?'),
    ).resolves.toEqual({
      intent: 'technical',
      confidence: 0.95,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://generativelanguage.googleapis.com/v1beta/models/test-model:generateContent?key=test-api-key',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const request = fetchMock.mock.calls[0]?.[1];
    const body = JSON.parse(request?.body as string) as {
      contents: Array<{ role: string; parts: Array<{ text: string }> }>;
    };

    expect(body.contents[0]?.role).toBe('user');
    expect(body.contents[0]?.parts[0]?.text).toContain(
      'What is dependency injection in NestJS?',
    );
  });

  it('parses a JSON response wrapped in a markdown code block', async () => {
    fetchMock.mockResolvedValue(
      createResponse({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '```json\n{"intent":"question","confidence":0.9}\n```',
                },
              ],
            },
          },
        ],
      }),
    );

    await expect(service.classify('How do I use Docker?')).resolves.toEqual({
      intent: 'question',
      confidence: 0.9,
    });
  });

  it('rejects an invalid intent', async () => {
    fetchMock.mockResolvedValue(
      createResponse({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    intent: 'banana',
                    confidence: 0.95,
                  }),
                },
              ],
            },
          },
        ],
      }),
    );

    await expect(service.classify('Hello')).rejects.toThrow(
      'Invalid AI classification response',
    );
  });

  it('rejects an invalid confidence', async () => {
    fetchMock.mockResolvedValue(
      createResponse({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    intent: 'technical',
                    confidence: 5,
                  }),
                },
              ],
            },
          },
        ],
      }),
    );

    await expect(service.classify('Hello')).rejects.toThrow(
      'Invalid AI classification response',
    );
  });

  it('rejects an empty Gemini response', async () => {
    fetchMock.mockResolvedValue(createResponse({ candidates: [] }));

    await expect(service.classify('Hello')).rejects.toThrow(
      'Gemini returned an empty classification',
    );
  });

  it('propagates Gemini HTTP failures as service unavailable', async () => {
    fetchMock.mockResolvedValue(
      createResponse(undefined, {
        ok: false,
        status: 503,
        text: () => Promise.resolve('Service unavailable'),
      }),
    );

    await expect(service.classify('Hello')).rejects.toThrow(
      'Gemini classification request failed',
    );
  });

  it('fails before making a request when the API key is missing', async () => {
    configService.get.mockReturnValue(undefined);

    await expect(service.classify('Hello')).rejects.toThrow(
      InternalServerErrorException,
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

function createResponse(
  body: unknown = undefined,
  overrides: {
    ok?: boolean;
    status?: number;
    text?: () => Promise<string>;
  } = {},
): Response {
  return {
    ok: true,
    json: jest.fn<() => Promise<unknown>>().mockResolvedValue(body),
    text: jest.fn<() => Promise<string>>().mockResolvedValue(''),
    ...overrides,
  } as unknown as Response;
}
