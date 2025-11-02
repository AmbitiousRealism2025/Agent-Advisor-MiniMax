import 'dotenv/config';

import { validateMinimaxEnvironment } from './validation.js';

const MINIMAX_BASE_URL = 'https://api.minimax.io/anthropic';
const MINIMAX_MODEL = 'MiniMax-M2';

export interface MinimaxConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  cliPath?: string;
}

export function getMinimaxConfig(env: NodeJS.ProcessEnv = process.env): MinimaxConfig {
  const validation = validateMinimaxEnvironment(env);

  if (!validation.success) {
    throw new Error(validation.errors.join('\n'));
  }

  const parsedUrl = new URL(MINIMAX_BASE_URL);
  if (!/^https?:$/.test(parsedUrl.protocol)) {
    throw new Error(`Invalid MiniMax base URL protocol: ${parsedUrl.protocol}`);
  }

  const { MINIMAX_JWT_TOKEN, CLI_PATH } = validation.data;

  return {
    baseUrl: MINIMAX_BASE_URL,
    apiKey: MINIMAX_JWT_TOKEN,
    model: MINIMAX_MODEL,
    ...(CLI_PATH ? { cliPath: CLI_PATH } : {})
  };
}

/**
 * Apply MiniMax configuration to global environment variables expected by the Claude SDK.
 *
 * MiniMax credentials are validated via {@link getMinimaxConfig}. Because the Claude Agent SDK
 * reads `ANTHROPIC_*` environment variables at runtime, we propagate the values once during
 * process bootstrap rather than mutating them on every advisor invocation. Schemas and
 * configuration are static for the lifetime of the process, so this mutation is performed once
 * intentionally.
 */
export function applyMinimaxEnvironment(
  config: MinimaxConfig,
  env: NodeJS.ProcessEnv = process.env
): void {
  env.ANTHROPIC_BASE_URL = config.baseUrl;
  env.ANTHROPIC_API_KEY = config.apiKey;

  if (config.cliPath) {
    env.CLAUDE_CLI_PATH = config.cliPath;
  }
}

export default getMinimaxConfig;
