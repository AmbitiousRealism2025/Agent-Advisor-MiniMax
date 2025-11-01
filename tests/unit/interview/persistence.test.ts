/**
 * Unit Tests - Interview Persistence
 *
 * Tests session save/load/delete operations and cleanup.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMockInterviewState, createTempDirectory, cleanupTempDirectory } from '../../utils/test-helpers.js';
import { promises as fs } from 'fs';
import path from 'path';

describe('Interview Persistence', () => {
  let tempDir: string;
  let saveSession: any;
  let loadSession: any;
  let listSessions: any;
  let deleteSession: any;
  let cleanupOldSessions: any;
  let setSessionsDir: any;

  beforeEach(async () => {
    tempDir = await createTempDirectory('sessions');
    process.env.SESSIONS_DIR = tempDir;

    // Dynamic import after setting env
    const persistence = await import('../../../src/lib/interview/persistence.js');
    saveSession = persistence.saveSession;
    loadSession = persistence.loadSession;
    listSessions = persistence.listSessions;
    deleteSession = persistence.deleteSession;
    cleanupOldSessions = persistence.cleanupOldSessions;
    setSessionsDir = persistence.setSessionsDir;

    // Configure sessions directory for test isolation
    await setSessionsDir(tempDir);
  });

  afterEach(async () => {
    await cleanupTempDirectory(tempDir);
    delete process.env.SESSIONS_DIR;
  });

  it('should save session to file', async () => {
    const state = createMockInterviewState({
      sessionId: 'test-session-save'
    });

    await saveSession(state);

    const filePath = path.join(tempDir, `${state.sessionId}.json`);
    const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
    expect(fileExists).toBe(true);

    const fileContent = await fs.readFile(filePath, 'utf-8');
    const savedData = JSON.parse(fileContent);
    expect(savedData.sessionId).toBe(state.sessionId);
    expect(savedData.interviewState).toBeDefined();
    expect(typeof savedData.timestamp).toBe('string'); // ISO string
  });

  it('should load session from file', async () => {
    const originalState = createMockInterviewState({
      sessionId: 'test-session-load',
      currentStage: 'requirements',
      currentQuestionIndex: 5
    });

    await saveSession(originalState);
    const loadedState = await loadSession(originalState.sessionId);

    expect(loadedState).not.toBeNull();
    expect(loadedState?.sessionId).toBe(originalState.sessionId);
    expect(loadedState?.currentStage).toBe(originalState.currentStage);
    expect(loadedState?.currentQuestionIndex).toBe(originalState.currentQuestionIndex);
  });

  it('should return null for non-existent session', async () => {
    const loadedState = await loadSession('non-existent-id');
    expect(loadedState).toBeNull();
  });

  it('should list all sessions', async () => {
    const state1 = createMockInterviewState({ sessionId: 'session-1' });
    const state2 = createMockInterviewState({ sessionId: 'session-2' });
    const state3 = createMockInterviewState({ sessionId: 'session-3' });

    await saveSession(state1);
    await saveSession(state2);
    await saveSession(state3);

    const sessions = await listSessions();
    expect(sessions).toHaveLength(3);
    expect(sessions.map((s: { sessionId: string; timestamp: Date }) => s.sessionId)).toContain('session-1');
    expect(sessions.map((s: { sessionId: string; timestamp: Date }) => s.sessionId)).toContain('session-2');
    expect(sessions.map((s: { sessionId: string; timestamp: Date }) => s.sessionId)).toContain('session-3');

    // Should be sorted by timestamp descending
    expect(sessions[0].timestamp).toBeInstanceOf(Date);
  });

  it('should delete session', async () => {
    const state = createMockInterviewState({ sessionId: 'session-to-delete' });
    await saveSession(state);

    const deleteResult = await deleteSession(state.sessionId);
    expect(deleteResult).toBe(true);

    const filePath = path.join(tempDir, `${state.sessionId}.json`);
    const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
    expect(fileExists).toBe(false);

    // Deleting again should return false
    const deleteAgain = await deleteSession(state.sessionId);
    expect(deleteAgain).toBe(false);
  });

  it('should cleanup old sessions', async () => {
    const now = Date.now();
    const eightDaysAgo = new Date(now - 8 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now - 1 * 24 * 60 * 60 * 1000);

    const oldState = createMockInterviewState({
      sessionId: 'old-session'
    });

    const recentState = createMockInterviewState({
      sessionId: 'recent-session'
    });

    await saveSession(oldState);
    await saveSession(recentState);

    // Manually update timestamps in saved files to simulate age
    const oldFilePath = path.join(tempDir, 'old-session.json');
    const oldContent = JSON.parse(await fs.readFile(oldFilePath, 'utf-8'));
    oldContent.timestamp = eightDaysAgo.toISOString();
    await fs.writeFile(oldFilePath, JSON.stringify(oldContent, null, 2));

    const recentFilePath = path.join(tempDir, 'recent-session.json');
    const recentContent = JSON.parse(await fs.readFile(recentFilePath, 'utf-8'));
    recentContent.timestamp = oneDayAgo.toISOString();
    await fs.writeFile(recentFilePath, JSON.stringify(recentContent, null, 2));

    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    const cleanedCount = await cleanupOldSessions(maxAge);
    expect(cleanedCount).toBe(1);

    // Old session should be deleted
    const oldExists = await fs.access(path.join(tempDir, 'old-session.json'))
      .then(() => true)
      .catch(() => false);
    expect(oldExists).toBe(false);

    // Recent session should still exist
    const recentExists = await fs.access(path.join(tempDir, 'recent-session.json'))
      .then(() => true)
      .catch(() => false);
    expect(recentExists).toBe(true);
  });

  it('should handle corrupted session files', async () => {
    const sessionId = 'corrupted-session';
    const filePath = path.join(tempDir, `${sessionId}.json`);

    // Write invalid JSON
    await fs.writeFile(filePath, 'invalid json content');

    // Should throw on loading corrupted file (not return null)
    await expect(loadSession(sessionId)).rejects.toThrow();
  });

  it('should serialize and deserialize responses correctly', async () => {
    const state = createMockInterviewState({
      sessionId: 'response-test',
      responses: [
        {
          questionId: 'q1_agent_name',
          value: 'Test Agent',
          timestamp: new Date()
        },
        {
          questionId: 'q8_file_access',
          value: true,
          timestamp: new Date()
        }
      ]
    });

    await saveSession(state);
    const loadedState = await loadSession(state.sessionId);

    expect(loadedState?.responses).toHaveLength(2);
    expect(loadedState?.responses[0].timestamp).toBeInstanceOf(Date);
    expect(loadedState?.responses[0].value).toBe('Test Agent');
    expect(loadedState?.responses[1].value).toBe(true);
  });

  it('should handle empty sessions directory', async () => {
    const sessions = await listSessions();
    expect(sessions).toEqual([]);
  });

  it('should isolate sessions to configured directory', async () => {
    const state = createMockInterviewState({ sessionId: 'isolated-session' });
    await saveSession(state);

    // Verify file is in temp directory, not default sessions/
    const tempFilePath = path.join(tempDir, 'isolated-session.json');
    const tempExists = await fs.access(tempFilePath).then(() => true).catch(() => false);
    expect(tempExists).toBe(true);

    // Verify it's not in the default location
    const defaultPath = path.join(process.cwd(), 'sessions', 'isolated-session.json');
    const defaultExists = await fs.access(defaultPath).then(() => true).catch(() => false);
    expect(defaultExists).toBe(false);
  });
});
