import type { AgentRecommendations, AgentRequirements } from './agent.js';

export type InterviewStage =
  | 'discovery'
  | 'requirements'
  | 'architecture'
  | 'output'
  | 'complete';

export type QuestionType = 'text' | 'choice' | 'boolean' | 'multiselect';

export interface Response {
  questionId: string;
  value: string | boolean | string[];
  timestamp: Date;
}

export interface InterviewQuestion {
  id: string;
  stage: InterviewStage;
  text: string;
  type: QuestionType;
  required: boolean;
  options?: string[];
  hint?: string;
  followUp?: string;
}

export interface ConversationMetadata {
  advisorSessionId: string | null;
  messageCount: number;
  lastActivity: Date;
  conversationStarted: Date;
}

export interface InterviewState {
  sessionId: string;
  currentStage: InterviewStage;
  currentQuestionIndex: number;
  responses: Response[];
  requirements: Partial<AgentRequirements>;
  recommendations: AgentRecommendations | null;
  isComplete: boolean;
  startedAt?: Date;
  lastUpdatedAt?: Date;
  conversationMetadata?: ConversationMetadata;
}

export interface PersistedState {
  sessionId: string;
  timestamp: Date;
  interviewState: InterviewState;
  partialRequirements: Partial<AgentRequirements>;
  conversationMetadata?: ConversationMetadata;
}
