import { z } from 'zod';
import type { AgentRequirements } from '../types/agent.js';

const jwtPattern = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/;

export const minimaxEnvSchema = z.object({
  MINIMAX_JWT_TOKEN: z
    .string()
    .trim()
    .min(1, 'Environment variable MINIMAX_JWT_TOKEN is required for MiniMax authentication.')
    .regex(jwtPattern, 'MINIMAX_JWT_TOKEN must be a valid JWT formatted token (three base64url-encoded segments separated by dots).'),
  CLI_PATH: z.string().trim().min(1).optional().or(z.literal(''))
});

type MinimaxEnvSchema = z.infer<typeof minimaxEnvSchema>;

export const agentCapabilitiesSchema = z.object({
  memory: z.enum(['none', 'short-term', 'long-term']),
  fileAccess: z.boolean(),
  webAccess: z.boolean(),
  codeExecution: z.boolean(),
  dataAnalysis: z.boolean(),
  toolIntegrations: z.array(z.string()).default([]),
  notes: z.string().optional()
});

export const agentRequirementsSchema = z.object({
  name: z.string().min(1, 'Agent name is required.'),
  description: z.string().min(1, 'Provide a short description of the agent.'),
  primaryOutcome: z.string().min(1, 'Primary outcome helps determine the right template.'),
  targetAudience: z.array(z.string()).min(1, 'Identify at least one target audience segment.'),
  interactionStyle: z.enum(['conversational', 'task-focused', 'collaborative'], {
    errorMap: () => ({ message: 'Interaction style must be conversational, task-focused, or collaborative.' })
  }),
  deliveryChannels: z.array(z.string()).min(1, 'Specify at least one delivery channel (CLI, web, IDE, etc.).'),
  successMetrics: z.array(z.string()).min(1, 'Define how success will be measured.'),
  constraints: z.array(z.string()).optional(),
  preferredTechnologies: z.array(z.string()).optional(),
  capabilities: agentCapabilitiesSchema,
  environment: z
    .object({
      runtime: z.enum(['cloud', 'local', 'hybrid']),
      deploymentTargets: z.array(z.string()).optional(),
      complianceRequirements: z.array(z.string()).optional()
    })
    .optional(),
  additionalNotes: z.string().optional()
});

export const interviewResponseSchema = z.object({
  questionId: z.string().min(1, 'Response must reference a valid question.'),
  value: z.union([
    z.string(),
    z.boolean(),
    z.array(z.string())
  ]),
  timestamp: z.union([
    z.date(),
    z.string().transform((value, ctx) => {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Timestamp must be a valid ISO date string.' });
        return z.NEVER;
      }
      return date;
    })
  ])
});

export type ValidationSuccess<T> = { success: true; data: T; errors?: never };
export type ValidationFailure = { success: false; errors: string[]; data?: never };
export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

const environmentSchema = minimaxEnvSchema
  .extend({
    LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
    NODE_ENV: z.enum(['development', 'test', 'production', 'staging']).default('development')
  })
  .passthrough();

type EnvironmentSchema = z.infer<typeof environmentSchema>;

export function validateMinimaxEnvironment(env: Record<string, unknown>): ValidationResult<MinimaxEnvSchema> {
  const result = minimaxEnvSchema.safeParse(env);

  if (!result.success) {
    const errors = result.error.errors.map((issue) => issue.message);
    return { success: false, errors };
  }

  return { success: true, data: result.data };
}

export function validateAgentRequirements(data: unknown): ValidationResult<AgentRequirements> {
  const result = agentRequirementsSchema.safeParse(data);

  if (!result.success) {
    const errors = result.error.errors.map((issue) => {
      const path = issue.path.join('.') || 'root';
      return `${path}: ${issue.message}`;
    });

    return { success: false, errors };
  }

  return { success: true, data: result.data as AgentRequirements };
}

export function validateEnvironmentVariables(env: Record<string, unknown>): ValidationResult<EnvironmentSchema> {
  const result = environmentSchema.safeParse(env);

  if (!result.success) {
    const errors = result.error.errors.map((issue) => issue.message);
    return { success: false, errors };
  }

  return { success: true, data: result.data };
}

/**
 * Cached maximum thinking block length value
 */
let cachedMaxThinkingLength: number | null = null;

/**
 * Get the maximum thinking block message length for truncation from environment variable.
 * Defaults to 300 characters if not set or invalid.
 * Clamps value to safe range of 50-1000 characters.
 * Result is memoized for performance.
 *
 * @returns The validated maximum message length
 */
export function getMaxThinkingLength(): number {
  // Return cached value if already computed
  if (cachedMaxThinkingLength !== null) {
    return cachedMaxThinkingLength;
  }

  const envValue = process.env.MAX_MESSAGE_LENGTH;
  if (!envValue) {
    cachedMaxThinkingLength = 300; // Default value
    return cachedMaxThinkingLength;
  }

  const parsed = parseInt(envValue, 10);
  if (isNaN(parsed)) {
    cachedMaxThinkingLength = 300; // Default if invalid
    return cachedMaxThinkingLength;
  }

  // Clamp to safe range: 50-1000
  cachedMaxThinkingLength = Math.max(50, Math.min(1000, parsed));
  return cachedMaxThinkingLength;
}

/**
 * Truncate a message using smart truncation algorithm.
 * If text fits within maxLength, returns original text.
 * Otherwise, keeps first 2/3 and last 1/3 of allowed length with '...' separator.
 *
 * @param text - The text to truncate
 * @param maxLength - Maximum allowed length
 * @returns Truncated text or original if within limit
 */
export function truncateMessage(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  // Smart truncation: keep first 2/3 and last 1/3
  const startChars = Math.floor(maxLength * 0.67);
  const endChars = maxLength - startChars - 3; // -3 for '...'

  return text.substring(0, startChars) + '...' + text.substring(text.length - endChars);
}
