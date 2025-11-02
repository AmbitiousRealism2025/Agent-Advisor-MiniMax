import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const {
  minimaxConfig,
  queryInvocationSpy,
  createSdkMcpServerMock,
  getMinimaxConfigMock,
} = vi.hoisted(() => {
  const config = {
    baseUrl: 'https://mock.minimax.local',
    apiKey: 'mock-test-key',
    model: 'MiniMax-M2-Test',
  };

  return {
    minimaxConfig: config,
    queryInvocationSpy: vi.fn(),
    createSdkMcpServerMock: vi.fn(() => ({ type: 'sdk', instance: 'mock' })),
    getMinimaxConfigMock: vi.fn(() => config),
  };
});

vi.mock('@anthropic-ai/claude-agent-sdk', async () => {
  const actual = await vi.importActual<typeof import('@anthropic-ai/claude-agent-sdk')>(
    '@anthropic-ai/claude-agent-sdk'
  );

  return {
    ...actual,
    query: (params: any) => {
      queryInvocationSpy(params);
      return (async function* () {
        yield {
          type: 'assistant',
          message: {
            content: [
              {
                type: 'text',
                text: 'mock response',
              },
            ],
          },
        };
      })();
    },
    createSdkMcpServer: createSdkMcpServerMock,
  };
});

vi.mock('../../../src/utils/minimax-config.js', () => ({
  getMinimaxConfig: getMinimaxConfigMock,
}));

import { runAdvisor } from '../../../src/advisor-agent.js';

describe('runAdvisor environment handling', () => {
  const originalBaseUrl = process.env.ANTHROPIC_BASE_URL;
  const originalApiKey = process.env.ANTHROPIC_API_KEY;
  let originalStdoutWrite: typeof process.stdout.write;

  beforeEach(() => {
    queryInvocationSpy.mockClear();
    createSdkMcpServerMock.mockClear();
    getMinimaxConfigMock.mockClear();
    originalStdoutWrite = process.stdout.write;
    process.stdout.write = vi.fn() as unknown as typeof process.stdout.write;
  });

  afterEach(() => {
    process.stdout.write = originalStdoutWrite;
    if (typeof originalBaseUrl === 'undefined') {
      delete process.env.ANTHROPIC_BASE_URL;
    } else {
      process.env.ANTHROPIC_BASE_URL = originalBaseUrl;
    }

    if (typeof originalApiKey === 'undefined') {
      delete process.env.ANTHROPIC_API_KEY;
    } else {
      process.env.ANTHROPIC_API_KEY = originalApiKey;
    }
  });

  it('does not mutate process.env between invocations and avoids setting options.env', async () => {
    await runAdvisor('first message');
    await runAdvisor('second message');

    if (typeof originalBaseUrl === 'undefined') {
      expect(process.env.ANTHROPIC_BASE_URL).toBeUndefined();
    } else {
      expect(process.env.ANTHROPIC_BASE_URL).toBe(originalBaseUrl);
    }

    if (typeof originalApiKey === 'undefined') {
      expect(process.env.ANTHROPIC_API_KEY).toBeUndefined();
    } else {
      expect(process.env.ANTHROPIC_API_KEY).toBe(originalApiKey);
    }

    expect(queryInvocationSpy).toHaveBeenCalledTimes(2);

    for (const call of queryInvocationSpy.mock.calls) {
      const [args] = call;
      expect(args?.options?.env).toBeUndefined();
    }
  });
});
