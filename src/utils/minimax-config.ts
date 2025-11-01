import 'dotenv/config';

const MINIMAX_BASE_URL = 'https://api.minimax.io/anthropic';
const MINIMAX_MODEL = 'MiniMax-M2';

export interface MinimaxConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  cliPath?: string;
}

interface ValidationResult {
  apiKey: string;
  cliPath?: string;
}

export function validateConfig(env: NodeJS.ProcessEnv = process.env): ValidationResult {
  const apiKey = env.MINIMAX_JWT_TOKEN?.trim();
  if (!apiKey) {
    throw new Error('Environment variable MINIMAX_JWT_TOKEN is required for MiniMax authentication.');
  }

  const jwtPattern = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/;
  if (!jwtPattern.test(apiKey)) {
    throw new Error('MINIMAX_JWT_TOKEN must be a valid JWT formatted token (three base64url-encoded segments separated by dots).');
  }

  const parsedUrl = new URL(MINIMAX_BASE_URL);
  if (!/^https?:$/.test(parsedUrl.protocol)) {
    throw new Error(`Invalid MiniMax base URL protocol: ${parsedUrl.protocol}`);
  }

  const cliPath = env.CLI_PATH?.trim();
  return cliPath ? { apiKey, cliPath } : { apiKey };
}

export function getMinimaxConfig(): MinimaxConfig {
  const { apiKey, cliPath } = validateConfig();

  return {
    baseUrl: MINIMAX_BASE_URL,
    apiKey,
    model: MINIMAX_MODEL,
    ...(cliPath ? { cliPath } : {})
  };
}

export default getMinimaxConfig;
