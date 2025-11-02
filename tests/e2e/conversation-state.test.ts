/**
 * End-to-End Tests: Conversation State Persistence
 *
 * Validates that conversation metadata persists across sessions, resumes correctly,
 * and supports multiple concurrent sessions.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InterviewStateManager } from '../../src/lib/interview/state-manager.js';
import {
  saveSession,
  loadSession,
  listSessions,
  setSessionsDir,
  deleteSession
} from '../../src/lib/interview/persistence.js';
import {
  createTempDirectory,
  cleanupTempDirectory,
  createMockTimestamp
} from '../utils/test-helpers.js';
import type { ConversationMetadata } from '../../src/types/interview.js';
import { sampleDataAnalystRequirements } from '../fixtures/sample-requirements.js';

const questionResponses: Array<[string, string | boolean | string[]]> = [
  ['q1_agent_name', sampleDataAnalystRequirements.name],
  ['q2_primary_outcome', sampleDataAnalystRequirements.primaryOutcome],
  ['q3_target_audience', sampleDataAnalystRequirements.targetAudience],
  ['q4_interaction_style', sampleDataAnalystRequirements.interactionStyle],
  ['q5_delivery_channels', sampleDataAnalystRequirements.deliveryChannels],
  ['q6_success_metrics', sampleDataAnalystRequirements.successMetrics],
  ['q7_memory_needs', sampleDataAnalystRequirements.capabilities.memory],
  ['q8_file_access', sampleDataAnalystRequirements.capabilities.fileAccess],
  ['q9_web_access', sampleDataAnalystRequirements.capabilities.webAccess],
  ['q10_code_execution', sampleDataAnalystRequirements.capabilities.codeExecution],
  ['q11_data_analysis', sampleDataAnalystRequirements.capabilities.dataAnalysis],
  ['q12_tool_integrations', (sampleDataAnalystRequirements.capabilities.toolIntegrations || []).join(', ')],
  ['q13_runtime_preference', sampleDataAnalystRequirements.environment?.runtime || 'local'],
  ['q14_constraints', (sampleDataAnalystRequirements.constraints || []).join(', ')],
  ['q15_additional_notes', sampleDataAnalystRequirements.additionalNotes || '']
];

function recordResponses(manager: InterviewStateManager, startIndex: number, count: number): void {
  const upperBound = Math.min(startIndex + count, questionResponses.length);
  for (let i = startIndex; i < upperBound; i++) {
    const [questionId, value] = questionResponses[i];
    manager.recordResponse(questionId, value);
  }
}

describe('Conversation State Persistence E2E', () => {
  let stateManager: InterviewStateManager;
  let tempDir: string;

  beforeEach(async () => {
    stateManager = new InterviewStateManager();
    stateManager.initializeSession();
    tempDir = await createTempDirectory('conversation-state');
    await setSessionsDir(tempDir);
  });

  afterEach(async () => {
    await cleanupTempDirectory(tempDir);
  });

  it('should persist conversation metadata across interview sessions', async () => {
    recordResponses(stateManager, 0, 5);

    const metadata: ConversationMetadata = {
      advisorSessionId: 'test-session-123',
      messageCount: 5,
      lastActivity: createMockTimestamp(60000),
      conversationStarted: createMockTimestamp(0)
    };

    stateManager.updateConversationMetadata(metadata);
    await saveSession(stateManager.getState());

    const loadedState = await loadSession(stateManager.getState().sessionId);
    expect(loadedState).not.toBeNull();

    const newManager = new InterviewStateManager();
    newManager.loadState(loadedState!);
    const restoredMetadata = newManager.getConversationMetadata();

    expect(restoredMetadata).not.toBeNull();
    expect(restoredMetadata?.advisorSessionId).toBe(metadata.advisorSessionId);
    expect(restoredMetadata?.messageCount).toBe(metadata.messageCount);
    expect(restoredMetadata?.lastActivity?.toISOString()).toBe(metadata.lastActivity.toISOString());
    expect(restoredMetadata?.conversationStarted?.toISOString()).toBe(metadata.conversationStarted.toISOString());
  });

  it('should resume interview from saved state', async () => {
    recordResponses(stateManager, 0, 8);

    const metadata: ConversationMetadata = {
      advisorSessionId: 'resume-session-001',
      messageCount: 8,
      lastActivity: new Date(),
      conversationStarted: createMockTimestamp(-300000)
    };

    stateManager.updateConversationMetadata(metadata);
    await saveSession(stateManager.getState());

    const persistedState = await loadSession(stateManager.getState().sessionId);
    expect(persistedState).not.toBeNull();

    const resumedManager = new InterviewStateManager();
    resumedManager.loadState(persistedState!);

    expect(resumedManager.getState().responses.length).toBe(8);
    expect(resumedManager.getConversationMetadata()?.advisorSessionId).toBe('resume-session-001');

    // Continue remaining questions
    const answeredCount = resumedManager.getState().responses.length;
    recordResponses(resumedManager, answeredCount, questionResponses.length - answeredCount);
    expect(resumedManager.isComplete()).toBe(true);

    const requirements = resumedManager.getCollectedRequirements();
    expect(requirements.name).toBe(sampleDataAnalystRequirements.name);
    expect(requirements.capabilities?.dataAnalysis).toBe(true);
  });

  it('should track message count across multiple interactions', async () => {
    recordResponses(stateManager, 0, 3);

    const baseMetadata: ConversationMetadata = {
      advisorSessionId: 'multi-message-session',
      messageCount: 0,
      lastActivity: new Date(),
      conversationStarted: new Date()
    };

    for (let i = 1; i <= 5; i++) {
      stateManager.updateConversationMetadata({
        ...baseMetadata,
        messageCount: i,
        lastActivity: createMockTimestamp(i * 1000)
      });
      await saveSession(stateManager.getState());
    }

    const loadedState = await loadSession(stateManager.getState().sessionId);
    expect(loadedState?.conversationMetadata?.messageCount).toBe(5);
    expect(loadedState?.conversationMetadata?.advisorSessionId).toBe('multi-message-session');
  });

  it('should handle session resume after CLI restart', async () => {
    recordResponses(stateManager, 0, 5);

    const metadata: ConversationMetadata = {
      advisorSessionId: 'cli-session-test',
      messageCount: 5,
      lastActivity: new Date(),
      conversationStarted: createMockTimestamp(-600000)
    };

    stateManager.updateConversationMetadata(metadata);
    await saveSession(stateManager.getState());

    const sessions = await listSessions();
    expect(sessions.length).toBeGreaterThan(0);

    const latestSession = sessions[0];
    const restoredState = await loadSession(latestSession.sessionId);
    expect(restoredState).not.toBeNull();

    const resumedManager = new InterviewStateManager(latestSession.sessionId);
    resumedManager.loadState(restoredState!);

    expect(resumedManager.getConversationMetadata()?.advisorSessionId).toBe('cli-session-test');
    expect(resumedManager.getState().responses.length).toBe(5);

    // Continue interview from question 6 onwards
    const currentCount = resumedManager.getState().responses.length;
    recordResponses(resumedManager, currentCount, questionResponses.length - currentCount);

    expect(resumedManager.isComplete()).toBe(true);
  });

  it('should maintain conversation context with multiple sessions', async () => {
    const sessionManagers = Array.from({ length: 3 }, () => new InterviewStateManager());

    for (let index = 0; index < sessionManagers.length; index++) {
      sessionManagers[index].initializeSession();
      recordResponses(sessionManagers[index], 0, 4);
      sessionManagers[index].updateConversationMetadata({
        advisorSessionId: `multi-session-${index + 1}`,
        messageCount: 4,
        lastActivity: createMockTimestamp(index * 2000),
        conversationStarted: createMockTimestamp(-index * 2000)
      });
      await saveSession(sessionManagers[index].getState());
    }

    const sessions = await listSessions();
    expect(sessions.length).toBe(3);

    for (const session of sessions) {
      const persisted = await loadSession(session.sessionId);
      expect(persisted).not.toBeNull();
      expect(persisted?.conversationMetadata?.advisorSessionId).toMatch(/multi-session-/);
    }

    // Cleanup sessions
    for (const session of sessions) {
      const removed = await deleteSession(session.sessionId);
      expect(removed).toBe(true);
    }

    const remaining = await listSessions();
    expect(remaining.length).toBe(0);
  });
});
