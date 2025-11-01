/**
 * Integration Tests - Interview Flow
 *
 * Tests the complete interview process from start to finish.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InterviewStateManager } from '../../src/lib/interview/state-manager.js';
import { QUESTIONS } from '../../src/lib/interview/questions.js';
import { saveSession, loadSession } from '../../src/lib/interview/persistence.js';
import { sampleInterviewResponses, partialInterviewResponses } from '../fixtures/sample-responses.js';

describe('Interview Flow Integration', () => {
  let manager: InterviewStateManager;

  beforeEach(() => {
    manager = new InterviewStateManager();
  });

  it('should complete full interview from start to finish', () => {
    manager.initializeSession();

    // Answer all 15 questions
    QUESTIONS.forEach(q => {
      const value = q.type === 'boolean' ? true :
                    q.type === 'multiselect' ? ['Test'] :
                    'Test value';
      manager.recordResponse(q.id, value);
    });

    const state = manager.getState();
    expect(state.isComplete).toBe(true);
    expect(state.requirements.name).toBeDefined();
    expect(state.requirements.primaryOutcome).toBeDefined();
  });

  it('should map responses to requirements correctly', () => {
    manager.initializeSession();

    manager.recordResponse('q1_agent_name', 'Test Agent');
    expect(manager.getRequirements().name).toBe('Test Agent');

    manager.recordResponse('q2_primary_outcome', 'Test outcome');
    expect(manager.getRequirements().primaryOutcome).toBe('Test outcome');

    manager.recordResponse('q3_target_audience', ['Developers', 'Analysts']);
    expect(manager.getRequirements().targetAudience).toEqual(['Developers', 'Analysts']);

    manager.recordResponse('q8_file_access', true);
    expect(manager.getRequirements().capabilities.fileAccess).toBe(true);
  });

  it('should advance through all 4 stages', () => {
    manager.initializeSession();
    expect(manager.getState().currentStage).toBe('discovery');

    // Answer discovery questions
    const discoveryQuestions = QUESTIONS.filter(q => q.stage === 'discovery');
    discoveryQuestions.forEach(q => {
      const value = q.type === 'boolean' ? true :
                    q.type === 'multiselect' ? ['Test'] :
                    'Test value';
      manager.recordResponse(q.id, value);
    });
    expect(manager.getState().currentStage).toBe('requirements');

    // Answer requirements questions
    const requirementsQuestions = QUESTIONS.filter(q => q.stage === 'requirements');
    requirementsQuestions.forEach(q => {
      const value = q.type === 'boolean' ? true :
                    q.type === 'multiselect' ? ['Test'] :
                    'Test value';
      manager.recordResponse(q.id, value);
    });
    expect(manager.getState().currentStage).toBe('architecture');

    // Answer architecture questions
    const architectureQuestions = QUESTIONS.filter(q => q.stage === 'architecture');
    architectureQuestions.forEach(q => {
      const value = q.type === 'boolean' ? true :
                    q.type === 'multiselect' ? ['Test'] :
                    q.type === 'choice' ? 'local' :
                    'Test value';
      manager.recordResponse(q.id, value);
    });
    expect(manager.getState().currentStage).toBe('output');

    // Answer output questions
    const outputQuestions = QUESTIONS.filter(q => q.stage === 'output');
    outputQuestions.forEach(q => {
      const value = q.type === 'boolean' ? true :
                    q.type === 'multiselect' ? ['Test'] :
                    'Test value';
      manager.recordResponse(q.id, value);
    });
    expect(manager.getState().currentStage).toBe('complete');
  });

  it('should persist and resume interview session', async () => {
    manager.initializeSession();

    // Answer first 8 questions (partial completion)
    for (let i = 0; i < 8; i++) {
      const question = QUESTIONS[i];
      const value = question.type === 'boolean' ? true :
                    question.type === 'multiselect' ? ['Test'] :
                    'Test value';
      manager.recordResponse(question.id, value);
    }

    const sessionId = manager.getState().sessionId;
    await saveSession(manager.getState());

    // Create new manager and load session
    const newManager = new InterviewStateManager();
    const loadedState = await loadSession(sessionId);
    if (loadedState) {
      newManager.loadState(loadedState);
    }

    expect(newManager.getState().sessionId).toBe(sessionId);
    expect(newManager.getState().responses.length).toBe(8);

    // Continue answering remaining questions
    const remaining = QUESTIONS.slice(8);
    remaining.forEach(q => {
      const value = q.type === 'boolean' ? true :
                    q.type === 'multiselect' ? ['Test'] :
                    q.type === 'choice' ? 'local' :
                    'Test value';
      newManager.recordResponse(q.id, value);
    });

    expect(newManager.getState().isComplete).toBe(true);
  });

  it('should handle multiselect responses correctly', () => {
    manager.initializeSession();

    manager.recordResponse('q3_target_audience', ['Developers', 'Analysts']);
    expect(manager.getRequirements().targetAudience).toEqual(['Developers', 'Analysts']);

    manager.recordResponse('q5_delivery_channels', ['CLI', 'API']);
    expect(manager.getRequirements().deliveryChannels).toEqual(['CLI', 'API']);
  });

  it('should parse comma-separated strings', () => {
    manager.initializeSession();

    manager.recordResponse('q12_tool_integrations', 'GitHub, Slack, PostgreSQL');
    expect(manager.getRequirements().capabilities.toolIntegrations).toEqual([
      'GitHub',
      'Slack',
      'PostgreSQL'
    ]);
  });
});
