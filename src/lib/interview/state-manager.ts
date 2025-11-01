import type {
  InterviewState,
  InterviewStage,
  InterviewQuestion,
  Response
} from '../../types/interview.js';
import type { AgentRequirements, AgentCapabilities } from '../../types/agent.js';
import { INTERVIEW_QUESTIONS } from './questions.js';
import { randomUUID } from 'crypto';

export class InterviewStateManager {
  private state: InterviewState;
  private questions: InterviewQuestion[];

  constructor(sessionId?: string) {
    this.questions = INTERVIEW_QUESTIONS;
    this.state = {
      sessionId: sessionId || randomUUID(),
      currentStage: 'discovery',
      currentQuestionIndex: 0,
      responses: [],
      requirements: {},
      recommendations: null,
      isComplete: false
    };
  }

  initializeSession(sessionId?: string): InterviewState {
    this.state = {
      sessionId: sessionId || randomUUID(),
      currentStage: 'discovery',
      currentQuestionIndex: 0,
      responses: [],
      requirements: {},
      recommendations: null,
      isComplete: false
    };
    return this.state;
  }

  getCurrentQuestion(): InterviewQuestion | null {
    const currentStageQuestions = this.getQuestionsForStage(this.state.currentStage);

    if (this.state.currentQuestionIndex >= currentStageQuestions.length) {
      return null;
    }

    return currentStageQuestions[this.state.currentQuestionIndex];
  }

  recordResponse(questionId: string, value: string | boolean | string[]): void {
    const response: Response = {
      questionId,
      value,
      timestamp: new Date()
    };

    const existingIndex = this.state.responses.findIndex(r => r.questionId === questionId);
    if (existingIndex >= 0) {
      this.state.responses[existingIndex] = response;
    } else {
      this.state.responses.push(response);
    }

    this.updateRequirementsFromResponse(questionId, value);

    this.state.currentQuestionIndex++;

    const currentStageQuestions = this.getQuestionsForStage(this.state.currentStage);
    if (this.state.currentQuestionIndex >= currentStageQuestions.length) {
      this.advanceStage();
    }
  }

  advanceStage(): boolean {
    const stages: InterviewStage[] = ['discovery', 'requirements', 'architecture', 'output', 'complete'];
    const currentIndex = stages.indexOf(this.state.currentStage);

    if (currentIndex === -1 || currentIndex >= stages.length - 1) {
      this.state.currentStage = 'complete';
      this.state.isComplete = true;
      return false;
    }

    this.state.currentStage = stages[currentIndex + 1] as InterviewStage;
    this.state.currentQuestionIndex = 0;

    if (this.state.currentStage === 'complete') {
      this.state.isComplete = true;
      return false;
    }

    return true;
  }

  getState(): InterviewState {
    return { ...this.state };
  }

  isComplete(): boolean {
    return this.state.isComplete;
  }

  getCollectedRequirements(): Partial<AgentRequirements> {
    return { ...this.state.requirements };
  }

  canResume(persistedState: InterviewState): boolean {
    if (!persistedState.sessionId || persistedState.isComplete) {
      return false;
    }

    const hasValidStage = ['discovery', 'requirements', 'architecture', 'output'].includes(
      persistedState.currentStage
    );

    return hasValidStage && Array.isArray(persistedState.responses);
  }

  loadState(persistedState: InterviewState): void {
    this.state = {
      ...persistedState,
      responses: persistedState.responses.map(r => ({
        ...r,
        timestamp: r.timestamp instanceof Date ? r.timestamp : new Date(r.timestamp)
      }))
    };
  }

  private getQuestionsForStage(stage: InterviewStage): InterviewQuestion[] {
    return this.questions.filter(q => q.stage === stage);
  }

  private updateRequirementsFromResponse(questionId: string, value: string | boolean | string[]): void {
    switch (questionId) {
      case 'q1_agent_name':
        this.state.requirements.name = value as string;
        break;

      case 'q2_primary_outcome':
        this.state.requirements.primaryOutcome = value as string;
        if (!this.state.requirements.description) {
          this.state.requirements.description = `Agent for: ${value}`;
        }
        break;

      case 'q3_target_audience':
        this.state.requirements.targetAudience = value as string[];
        break;

      case 'q4_interaction_style':
        this.state.requirements.interactionStyle = value as 'conversational' | 'task-focused' | 'collaborative';
        break;

      case 'q5_delivery_channels':
        this.state.requirements.deliveryChannels = value as string[];
        break;

      case 'q6_success_metrics':
        this.state.requirements.successMetrics = value as string[];
        break;

      case 'q7_memory_needs':
        if (!this.state.requirements.capabilities) {
          this.state.requirements.capabilities = this.getDefaultCapabilities();
        }
        this.state.requirements.capabilities.memory = value as 'none' | 'short-term' | 'long-term';
        break;

      case 'q8_file_access':
        if (!this.state.requirements.capabilities) {
          this.state.requirements.capabilities = this.getDefaultCapabilities();
        }
        this.state.requirements.capabilities.fileAccess = value as boolean;
        break;

      case 'q9_web_access':
        if (!this.state.requirements.capabilities) {
          this.state.requirements.capabilities = this.getDefaultCapabilities();
        }
        this.state.requirements.capabilities.webAccess = value as boolean;
        break;

      case 'q10_code_execution':
        if (!this.state.requirements.capabilities) {
          this.state.requirements.capabilities = this.getDefaultCapabilities();
        }
        this.state.requirements.capabilities.codeExecution = value as boolean;
        break;

      case 'q11_data_analysis':
        if (!this.state.requirements.capabilities) {
          this.state.requirements.capabilities = this.getDefaultCapabilities();
        }
        this.state.requirements.capabilities.dataAnalysis = value as boolean;
        break;

      case 'q12_tool_integrations':
        if (!this.state.requirements.capabilities) {
          this.state.requirements.capabilities = this.getDefaultCapabilities();
        }
        const integrations = typeof value === 'string'
          ? value.split(',').map(s => s.trim()).filter(Boolean)
          : [];
        this.state.requirements.capabilities.toolIntegrations = integrations;
        break;

      case 'q13_runtime_preference':
        if (!this.state.requirements.environment) {
          this.state.requirements.environment = {
            runtime: value as 'cloud' | 'local' | 'hybrid'
          };
        } else {
          this.state.requirements.environment.runtime = value as 'cloud' | 'local' | 'hybrid';
        }
        break;

      case 'q14_constraints':
        if (value && typeof value === 'string' && value.trim()) {
          this.state.requirements.constraints = value.split(',').map(s => s.trim()).filter(Boolean);
        }
        break;

      case 'q15_additional_notes':
        if (value && typeof value === 'string' && value.trim()) {
          this.state.requirements.additionalNotes = value as string;
        }
        break;
    }

    if (!this.state.requirements.description && this.state.requirements.name) {
      this.state.requirements.description = `${this.state.requirements.name} agent`;
    }
  }

  private getDefaultCapabilities(): AgentCapabilities {
    return {
      memory: 'none',
      fileAccess: false,
      webAccess: false,
      codeExecution: false,
      dataAnalysis: false,
      toolIntegrations: []
    };
  }
}
