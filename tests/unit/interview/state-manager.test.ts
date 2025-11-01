/**
 * Unit Tests - Interview State Manager
 *
 * Tests the InterviewStateManager class for session lifecycle management,
 * question progression, response recording, and requirements mapping.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InterviewStateManager } from '../../../src/lib/interview/state-manager.js';
import { QUESTIONS } from '../../../src/lib/interview/questions.js';
import { createMockInterviewState, wait } from '../../utils/test-helpers.js';

describe('InterviewStateManager', () => {
  let manager: InterviewStateManager;

  beforeEach(() => {
    manager = new InterviewStateManager();
  });

  it('should initialize with default state', () => {
    manager.initializeSession();
    const state = manager.getState();

    expect(state.sessionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(state.currentStage).toBe('discovery');
    expect(state.currentQuestionIndex).toBe(0);
    expect(state.responses).toEqual([]);
    expect(state.isComplete).toBe(false);
    expect(state.startedAt).toBeInstanceOf(Date);
    expect(state.lastUpdatedAt).toBeInstanceOf(Date);
  });

  it('should get current question for discovery stage', () => {
    manager.initializeSession();
    const question = manager.getCurrentQuestion();

    expect(question).not.toBeNull();
    expect(question?.stage).toBe('discovery');
    expect(question?.id).toBe('q1_agent_name');
  });

  it('should record response and advance question index', () => {
    manager.initializeSession();
    const question = manager.getCurrentQuestion();

    if (question) {
      manager.recordResponse(question.id, 'Test Agent');
      const state = manager.getState();

      expect(state.currentQuestionIndex).toBe(1);
      expect(state.responses).toHaveLength(1);
      expect(state.responses[0].questionId).toBe(question.id);
      expect(state.responses[0].value).toBe('Test Agent');
      expect(state.requirements.name).toBe('Test Agent');
    }
  });

  it('should advance to next stage when stage complete', () => {
    manager.initializeSession();

    // Answer all discovery questions (q1-q2)
    const discoveryQuestions = QUESTIONS.filter(q => q.stage === 'discovery');
    discoveryQuestions.forEach(q => {
      const value = q.type === 'boolean' ? true :
                    q.type === 'multiselect' ? ['Test'] :
                    'Test value';
      manager.recordResponse(q.id, value);
    });

    const state = manager.getState();
    expect(state.currentStage).toBe('requirements');
    expect(state.currentQuestionIndex).toBe(0);
  });

  it('should mark interview complete after all stages', () => {
    manager.initializeSession();

    // Answer all questions
    QUESTIONS.forEach(q => {
      const value = q.type === 'boolean' ? true :
                    q.type === 'multiselect' ? ['Test'] :
                    'Test value';
      manager.recordResponse(q.id, value);
    });

    const state = manager.getState();
    expect(state.isComplete).toBe(true);
    expect(state.currentStage).toBe('complete');
  });

  it('should update requirements from responses correctly', () => {
    manager.initializeSession();

    manager.recordResponse('q1_agent_name', 'Test Agent');
    expect(manager.getState().requirements.name).toBe('Test Agent');

    manager.recordResponse('q2_primary_outcome', 'Test outcome');
    expect(manager.getState().requirements.primaryOutcome).toBe('Test outcome');

    manager.recordResponse('q8_file_access', true);
    expect(manager.getState().requirements.capabilities.fileAccess).toBe(true);
  });

  it('should handle multiselect responses', () => {
    manager.initializeSession();

    manager.recordResponse('q3_target_audience', ['Developers', 'Analysts']);
    expect(manager.getState().requirements.targetAudience).toEqual(['Developers', 'Analysts']);

    manager.recordResponse('q5_delivery_channels', ['CLI', 'API']);
    expect(manager.getState().requirements.deliveryChannels).toEqual(['CLI', 'API']);
  });

  it('should parse comma-separated tool integrations', () => {
    manager.initializeSession();

    manager.recordResponse('q12_tool_integrations', 'GitHub, Slack, PostgreSQL');
    expect(manager.getState().requirements.capabilities.toolIntegrations).toEqual([
      'GitHub',
      'Slack',
      'PostgreSQL'
    ]);
  });

  it('should load persisted state', () => {
    const mockState = createMockInterviewState({
      sessionId: 'test-session-123',
      currentStage: 'requirements',
      currentQuestionIndex: 5,
      isComplete: false
    });

    manager.loadState(mockState);
    const loadedState = manager.getState();

    expect(loadedState.sessionId).toBe('test-session-123');
    expect(loadedState.currentStage).toBe('requirements');
    expect(loadedState.currentQuestionIndex).toBe(5);
    expect(loadedState.startedAt).toBeInstanceOf(Date);
    expect(loadedState.lastUpdatedAt).toBeInstanceOf(Date);
  });

  it('should validate resume capability', () => {
    manager.initializeSession();

    // Incomplete interview should be resumable
    expect(manager.canResume()).toBe(true);

    // Complete all questions
    QUESTIONS.forEach(q => {
      const value = q.type === 'boolean' ? true :
                    q.type === 'multiselect' ? ['Test'] :
                    'Test value';
      manager.recordResponse(q.id, value);
    });

    // Complete interview should not be resumable
    expect(manager.canResume()).toBe(false);
  });

  it('should track timestamp updates', async () => {
    manager.initializeSession();
    const initialTimestamp = manager.getState().lastUpdatedAt;

    await wait(10);

    manager.recordResponse('q1_agent_name', 'Test');
    const updatedTimestamp = manager.getState().lastUpdatedAt;

    expect(updatedTimestamp.getTime()).toBeGreaterThan(initialTimestamp.getTime());
  });

  it('should get requirements', () => {
    manager.initializeSession();
    manager.recordResponse('q1_agent_name', 'Test Agent');
    manager.recordResponse('q2_primary_outcome', 'Test outcome');

    const requirements = manager.getRequirements();
    expect(requirements.name).toBe('Test Agent');
    expect(requirements.primaryOutcome).toBe('Test outcome');
  });

  it('should get progress information', () => {
    manager.initializeSession();

    // Answer 5 questions
    for (let i = 0; i < 5; i++) {
      const question = manager.getCurrentQuestion();
      if (question) {
        const value = question.type === 'boolean' ? true :
                      question.type === 'multiselect' ? ['Test'] :
                      'Test value';
        manager.recordResponse(question.id, value);
      }
    }

    const progress = manager.getProgress();
    expect(progress.answered).toBe(5);
    expect(progress.total).toBe(QUESTIONS.length);
    expect(progress.percentage).toBeGreaterThan(0);
    expect(progress.percentage).toBeLessThanOrEqual(100);
  });
});
