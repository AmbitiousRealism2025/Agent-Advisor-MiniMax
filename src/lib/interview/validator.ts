import { z } from 'zod';
import type {
  InterviewQuestion,
  Response,
  InterviewStage
} from '../../types/interview.js';
import type { AgentRequirements } from '../../types/agent.js';
import {
  agentRequirementsSchema,
  interviewResponseSchema,
  type ValidationResult
} from '../../utils/validation.js';
import { INTERVIEW_QUESTIONS } from './questions.js';

const responseValueSchema = z.union([
  z.string().min(1, 'Text responses cannot be empty'),
  z.boolean(),
  z.array(z.string().min(1)).min(1, 'Must select at least one option')
]);

export function validateResponse(response: unknown): ValidationResult<Response> {
  const result = interviewResponseSchema.safeParse(response);

  if (!result.success) {
    const errors = result.error.errors.map((issue) => {
      const path = issue.path.join('.') || 'response';
      return `${path}: ${issue.message}`;
    });
    return { success: false, errors };
  }

  const valueResult = responseValueSchema.safeParse(result.data.value);
  if (!valueResult.success) {
    const errors = valueResult.error.errors.map(e => `value: ${e.message}`);
    return { success: false, errors };
  }

  return { success: true, data: result.data };
}

export function validateResponseAgainstQuestion(
  response: Response,
  question: InterviewQuestion
): ValidationResult<Response> {
  const errors: string[] = [];

  if (response.questionId !== question.id) {
    errors.push(`Response question ID "${response.questionId}" does not match question ID "${question.id}"`);
  }

  switch (question.type) {
    case 'text':
      if (typeof response.value !== 'string') {
        errors.push(`Question "${question.id}" expects a text response, got ${typeof response.value}`);
      } else if (question.required && response.value.trim().length === 0) {
        errors.push(`Question "${question.id}" is required and cannot be empty`);
      }
      break;

    case 'boolean':
      if (typeof response.value !== 'boolean') {
        errors.push(`Question "${question.id}" expects a boolean response, got ${typeof response.value}`);
      }
      break;

    case 'choice':
      if (typeof response.value !== 'string') {
        errors.push(`Question "${question.id}" expects a single choice (string), got ${typeof response.value}`);
      } else if (question.options && !question.options.includes(response.value)) {
        errors.push(
          `Question "${question.id}" received invalid choice "${response.value}". Valid options: ${question.options.join(', ')}`
        );
      }
      break;

    case 'multiselect':
      if (!Array.isArray(response.value)) {
        errors.push(`Question "${question.id}" expects multiple selections (array), got ${typeof response.value}`);
      } else {
        if (question.required && response.value.length === 0) {
          errors.push(`Question "${question.id}" is required and must have at least one selection`);
        }
        if (question.options) {
          const invalidChoices = (response.value as string[]).filter(
            v => !question.options!.includes(v)
          );
          if (invalidChoices.length > 0) {
            errors.push(
              `Question "${question.id}" received invalid choices: ${invalidChoices.join(', ')}. Valid options: ${question.options.join(', ')}`
            );
          }
        }
      }
      break;

    default:
      errors.push(`Unknown question type for question "${question.id}"`);
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return { success: true, data: response };
}

export function validateStageCompletion(
  stage: InterviewStage,
  responses: Response[]
): ValidationResult<boolean> {
  const errors: string[] = [];
  const stageQuestions = INTERVIEW_QUESTIONS.filter(q => q.stage === stage);
  const responseMap = new Map(responses.map(r => [r.questionId, r]));

  for (const question of stageQuestions) {
    if (!question.required) {
      continue;
    }

    const response = responseMap.get(question.id);
    if (!response) {
      errors.push(`Required question "${question.id}" (${question.text}) has no response`);
      continue;
    }

    const validationResult = validateResponseAgainstQuestion(response, question);
    if (!validationResult.success) {
      errors.push(...validationResult.errors);
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return { success: true, data: true };
}

export function validateCompleteRequirements(
  requirements: Partial<AgentRequirements>
): ValidationResult<AgentRequirements> {
  const result = agentRequirementsSchema.safeParse(requirements);

  if (!result.success) {
    const errors = result.error.errors.map((issue) => {
      const path = issue.path.join('.') || 'requirements';
      return `${path}: ${issue.message}`;
    });
    return { success: false, errors };
  }

  return { success: true, data: result.data as AgentRequirements };
}

export function getQuestionById(questionId: string): InterviewQuestion | undefined {
  return INTERVIEW_QUESTIONS.find(q => q.id === questionId);
}

export function validateAllResponses(responses: Response[]): ValidationResult<Response[]> {
  const errors: string[] = [];
  const validatedResponses: Response[] = [];

  for (const response of responses) {
    const basicValidation = validateResponse(response);
    if (!basicValidation.success) {
      errors.push(...basicValidation.errors);
      continue;
    }

    const question = getQuestionById(response.questionId);
    if (!question) {
      errors.push(`Response references unknown question ID: ${response.questionId}`);
      continue;
    }

    const questionValidation = validateResponseAgainstQuestion(response, question);
    if (!questionValidation.success) {
      errors.push(...questionValidation.errors);
      continue;
    }

    validatedResponses.push(basicValidation.data);
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return { success: true, data: validatedResponses };
}
