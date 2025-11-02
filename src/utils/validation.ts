import { z } from 'zod';
import type { AgentRequirements } from '../types/agent.js';

const jwtPattern = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/;

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

const environmentSchema = z
  .object({
    MINIMAX_JWT_TOKEN: z
      .string()
      .min(1, 'MINIMAX_JWT_TOKEN is required to authenticate with MiniMax.')
      .regex(jwtPattern, 'MINIMAX_JWT_TOKEN must be a valid JWT string.'),
    CLI_PATH: z.string().min(1).optional(),
    LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
    NODE_ENV: z.enum(['development', 'test', 'production', 'staging']).default('development')
  })
  .passthrough();

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

export function validateEnvironmentVariables(env: Record<string, unknown>): ValidationResult<Record<string, unknown>> {
  const result = environmentSchema.safeParse(env);

  if (!result.success) {
    const errors = result.error.errors.map((issue) => {
      const path = issue.path.join('.') || 'MINIMAX_JWT_TOKEN';
      return `${path}: ${issue.message}`;
    });

    return { success: false, errors };
  }

  return { success: true, data: result.data };
}
