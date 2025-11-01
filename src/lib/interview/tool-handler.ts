import { tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { InterviewStateManager } from './state-manager.js';
import {
  validateResponse,
  validateResponseAgainstQuestion,
  getQuestionById
} from './validator.js';
import {
  saveSession,
  loadSession,
  listSessions,
  deleteSession
} from './persistence.js';
import type { Response } from '../../types/interview.js';

const askInterviewQuestionSchemaShape = {
  action: z.enum(['start', 'answer', 'skip', 'resume', 'status'], {
    description: 'The action to perform: start new session, answer current question, skip question, resume existing session, or get status'
  }),
  sessionId: z.string().optional().describe('Session ID for resume or status actions'),
  response: z.union([
    z.string(),
    z.boolean(),
    z.array(z.string())
  ]).optional().describe('The answer to the current question (required for answer action)')
};

const askInterviewQuestionSchema = z.object(askInterviewQuestionSchemaShape);

type AskInterviewQuestionInput = z.infer<typeof askInterviewQuestionSchema>;

class InterviewToolHandler {
  private sessions: Map<string, InterviewStateManager>;

  constructor() {
    this.sessions = new Map();
  }

  async handleStart(): Promise<object> {
    const manager = new InterviewStateManager();
    const state = manager.initializeSession();
    this.sessions.set(state.sessionId, manager);

    await saveSession(state);

    const currentQuestion = manager.getCurrentQuestion();

    return {
      status: 'started',
      sessionId: state.sessionId,
      currentStage: state.currentStage,
      question: currentQuestion
        ? {
            id: currentQuestion.id,
            text: currentQuestion.text,
            type: currentQuestion.type,
            required: currentQuestion.required,
            options: currentQuestion.options,
            hint: currentQuestion.hint
          }
        : null,
      message: 'Interview session started. Answer the questions to define your agent requirements.'
    };
  }

  async handleAnswer(sessionId: string | undefined, responseValue: string | boolean | string[] | undefined): Promise<object> {
    if (!sessionId) {
      return {
        status: 'error',
        error: 'Session ID is required for answer action'
      };
    }

    if (responseValue === undefined) {
      return {
        status: 'error',
        error: 'Response value is required for answer action'
      };
    }

    let manager = this.sessions.get(sessionId);

    if (!manager) {
      const loadedState = await loadSession(sessionId);
      if (!loadedState) {
        return {
          status: 'error',
          error: `Session ${sessionId} not found. Use action=start to begin a new session.`
        };
      }
      manager = new InterviewStateManager();
      manager.loadState(loadedState);
      this.sessions.set(sessionId, manager);
    }

    const currentQuestion = manager.getCurrentQuestion();

    if (!currentQuestion) {
      return {
        status: 'complete',
        sessionId,
        requirements: manager.getCollectedRequirements(),
        message: 'Interview is already complete. All questions have been answered.'
      };
    }

    const response: Response = {
      questionId: currentQuestion.id,
      value: responseValue,
      timestamp: new Date()
    };

    const basicValidation = validateResponse(response);
    if (!basicValidation.success) {
      return {
        status: 'error',
        error: 'Invalid response format',
        details: basicValidation.errors
      };
    }

    const questionValidation = validateResponseAgainstQuestion(response, currentQuestion);
    if (!questionValidation.success) {
      return {
        status: 'error',
        error: 'Response does not match question requirements',
        details: questionValidation.errors,
        question: {
          id: currentQuestion.id,
          text: currentQuestion.text,
          type: currentQuestion.type,
          options: currentQuestion.options
        }
      };
    }

    manager.recordResponse(currentQuestion.id, responseValue);

    const state = manager.getState();
    await saveSession(state);

    if (manager.isComplete()) {
      return {
        status: 'complete',
        sessionId,
        requirements: manager.getCollectedRequirements(),
        message: 'Interview complete! All requirements have been collected.'
      };
    }

    const nextQuestion = manager.getCurrentQuestion();

    return {
      status: 'answered',
      sessionId,
      currentStage: state.currentStage,
      previousQuestion: currentQuestion.id,
      question: nextQuestion
        ? {
            id: nextQuestion.id,
            text: nextQuestion.text,
            type: nextQuestion.type,
            required: nextQuestion.required,
            options: nextQuestion.options,
            hint: nextQuestion.hint
          }
        : null,
      progress: {
        totalResponses: state.responses.length,
        currentStage: state.currentStage
      }
    };
  }

  async handleSkip(sessionId: string | undefined): Promise<object> {
    if (!sessionId) {
      return {
        status: 'error',
        error: 'Session ID is required for skip action'
      };
    }

    let manager = this.sessions.get(sessionId);

    if (!manager) {
      const loadedState = await loadSession(sessionId);
      if (!loadedState) {
        return {
          status: 'error',
          error: `Session ${sessionId} not found`
        };
      }
      manager = new InterviewStateManager();
      manager.loadState(loadedState);
      this.sessions.set(sessionId, manager);
    }

    const currentQuestion = manager.getCurrentQuestion();

    if (!currentQuestion) {
      return {
        status: 'complete',
        sessionId,
        requirements: manager.getCollectedRequirements()
      };
    }

    if (currentQuestion.required) {
      return {
        status: 'error',
        error: 'Cannot skip required question',
        question: {
          id: currentQuestion.id,
          text: currentQuestion.text,
          required: true
        }
      };
    }

    manager.recordResponse(currentQuestion.id, '');

    const state = manager.getState();
    await saveSession(state);

    const nextQuestion = manager.getCurrentQuestion();

    return {
      status: 'skipped',
      sessionId,
      skippedQuestion: currentQuestion.id,
      question: nextQuestion
        ? {
            id: nextQuestion.id,
            text: nextQuestion.text,
            type: nextQuestion.type,
            required: nextQuestion.required,
            options: nextQuestion.options,
            hint: nextQuestion.hint
          }
        : null
    };
  }

  async handleResume(sessionId: string | undefined): Promise<object> {
    if (!sessionId) {
      const sessions = await listSessions();
      return {
        status: 'sessions_list',
        sessions: sessions.map(s => ({
          sessionId: s.sessionId,
          timestamp: s.timestamp.toISOString()
        })),
        message: 'Provide a sessionId to resume a specific session'
      };
    }

    const loadedState = await loadSession(sessionId);

    if (!loadedState) {
      return {
        status: 'error',
        error: `Session ${sessionId} not found`
      };
    }

    const manager = new InterviewStateManager();

    if (!manager.canResume(loadedState)) {
      return {
        status: 'error',
        error: 'Session cannot be resumed (already complete or invalid)',
        sessionState: {
          isComplete: loadedState.isComplete,
          currentStage: loadedState.currentStage
        }
      };
    }

    manager.loadState(loadedState);
    this.sessions.set(sessionId, manager);

    const currentQuestion = manager.getCurrentQuestion();

    return {
      status: 'resumed',
      sessionId,
      currentStage: loadedState.currentStage,
      question: currentQuestion
        ? {
            id: currentQuestion.id,
            text: currentQuestion.text,
            type: currentQuestion.type,
            required: currentQuestion.required,
            options: currentQuestion.options,
            hint: currentQuestion.hint
          }
        : null,
      progress: {
        totalResponses: loadedState.responses.length,
        currentStage: loadedState.currentStage
      }
    };
  }

  async handleStatus(sessionId: string | undefined): Promise<object> {
    if (!sessionId) {
      const sessions = await listSessions();
      return {
        status: 'sessions_summary',
        totalSessions: sessions.length,
        sessions: sessions.slice(0, 10).map(s => ({
          sessionId: s.sessionId,
          timestamp: s.timestamp.toISOString()
        }))
      };
    }

    let manager = this.sessions.get(sessionId);

    if (!manager) {
      const loadedState = await loadSession(sessionId);
      if (!loadedState) {
        return {
          status: 'error',
          error: `Session ${sessionId} not found`
        };
      }
      manager = new InterviewStateManager();
      manager.loadState(loadedState);
      this.sessions.set(sessionId, manager);
    }

    const state = manager.getState();
    const currentQuestion = manager.getCurrentQuestion();

    return {
      status: 'session_status',
      sessionId,
      currentStage: state.currentStage,
      isComplete: state.isComplete,
      totalResponses: state.responses.length,
      currentQuestion: currentQuestion
        ? {
            id: currentQuestion.id,
            text: currentQuestion.text,
            type: currentQuestion.type
          }
        : null,
      collectedRequirements: state.requirements
    };
  }

  async handle(input: AskInterviewQuestionInput): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
    try {
      let result: object;

      switch (input.action) {
        case 'start':
          result = await this.handleStart();
          break;

        case 'answer':
          result = await this.handleAnswer(input.sessionId, input.response);
          break;

        case 'skip':
          result = await this.handleSkip(input.sessionId);
          break;

        case 'resume':
          result = await this.handleResume(input.sessionId);
          break;

        case 'status':
          result = await this.handleStatus(input.sessionId);
          break;

        default:
          result = {
            status: 'error',
            error: `Unknown action: ${input.action}`
          };
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            status: 'error',
            error: 'Internal error processing interview action',
            details: error instanceof Error ? error.message : String(error)
          }, null, 2)
        }]
      };
    }
  }
}

const handler = new InterviewToolHandler();

export const createInterviewTool = () => {
  return tool(
    'ask_interview_question',
    'Conducts an interactive interview to gather agent requirements. Supports starting sessions, answering questions, skipping optional questions, resuming previous sessions, and checking status.',
    askInterviewQuestionSchemaShape,
    async (input: AskInterviewQuestionInput) => handler.handle(input)
  );
};

export { InterviewToolHandler, askInterviewQuestionSchema, askInterviewQuestionSchemaShape };
