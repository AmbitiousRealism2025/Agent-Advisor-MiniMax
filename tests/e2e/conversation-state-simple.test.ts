/**
 * E2E Test: Conversation State Persistence (Simplified)
 *
 * Validates basic conversation metadata tracking and persistence.
 * Focuses on core functionality without complex session management.
 *
 * NOTE: Test parallelism is disabled for E2E tests (see vitest.config.ts:45-47)
 * to avoid race conditions in temp directories and streaming outputs.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InterviewStateManager } from '../../src/lib/interview/state-manager.js';
import type { ConversationMetadata } from '../../src/types/interview.js';

describe('E2E: Conversation State (Simplified)', () => {
  let stateManager: InterviewStateManager;

  beforeEach(() => {
    stateManager = new InterviewStateManager();
  });

  describe('Conversation Metadata Updates', () => {
    it('should update and retrieve conversation metadata', () => {
      const metadata: ConversationMetadata = {
        advisorSessionId: 'test-session-123',
        messageCount: 5,
        lastActivity: new Date('2025-01-15T10:30:00Z'),
        conversationStarted: new Date('2025-01-15T10:00:00Z'),
      };

      stateManager.updateConversationMetadata(metadata);
      const retrieved = stateManager.getConversationMetadata();

      expect(retrieved).toBeDefined();
      expect(retrieved?.advisorSessionId).toBe('test-session-123');
      expect(retrieved?.messageCount).toBe(5);
      expect(retrieved?.lastActivity).toEqual(new Date('2025-01-15T10:30:00Z'));
      expect(retrieved?.conversationStarted).toEqual(new Date('2025-01-15T10:00:00Z'));
    });

    it('should increment message count correctly', () => {
      const metadata: ConversationMetadata = {
        advisorSessionId: 'test-session-456',
        messageCount: 10,
        lastActivity: new Date(),
        conversationStarted: new Date(),
      };

      stateManager.updateConversationMetadata(metadata);

      // Simulate incrementing message count
      const current = stateManager.getConversationMetadata();
      const updated: ConversationMetadata = {
        ...current!,
        messageCount: (current?.messageCount || 0) + 1,
        lastActivity: new Date(),
      };

      stateManager.updateConversationMetadata(updated);
      const retrieved = stateManager.getConversationMetadata();

      expect(retrieved?.messageCount).toBe(11);
    });

    it('should return null when no metadata is set', () => {
      const metadata = stateManager.getConversationMetadata();
      expect(metadata).toBeNull();
    });

    it('should handle empty advisor session ID', () => {
      const metadata: ConversationMetadata = {
        advisorSessionId: '',
        messageCount: 0,
        lastActivity: new Date(),
        conversationStarted: new Date(),
      };

      stateManager.updateConversationMetadata(metadata);
      const retrieved = stateManager.getConversationMetadata();

      expect(retrieved?.advisorSessionId).toBe('');
      expect(retrieved?.messageCount).toBe(0);
    });

    it('should handle very large message counts', () => {
      const metadata: ConversationMetadata = {
        advisorSessionId: 'large-count-test',
        messageCount: 999999,
        lastActivity: new Date(),
        conversationStarted: new Date(),
      };

      stateManager.updateConversationMetadata(metadata);
      const retrieved = stateManager.getConversationMetadata();

      expect(retrieved?.messageCount).toBe(999999);
    });
  });

  describe('Timestamp Tracking', () => {
    it('should track lastActivity updates', () => {
      const startTime = new Date('2025-01-15T10:00:00Z');
      const updateTime = new Date('2025-01-15T10:30:00Z');

      stateManager.updateConversationMetadata({
        advisorSessionId: 'timestamp-test',
        messageCount: 1,
        lastActivity: startTime,
        conversationStarted: startTime,
      });

      // Simulate activity update
      stateManager.updateConversationMetadata({
        advisorSessionId: 'timestamp-test',
        messageCount: 2,
        lastActivity: updateTime,
        conversationStarted: startTime,
      });

      const metadata = stateManager.getConversationMetadata();
      expect(metadata?.lastActivity).toEqual(updateTime);
      expect(metadata?.conversationStarted).toEqual(startTime);
    });

    it('should preserve conversationStarted across updates', () => {
      const startTime = new Date('2025-01-15T09:00:00Z');

      stateManager.updateConversationMetadata({
        advisorSessionId: 'preserve-test',
        messageCount: 1,
        lastActivity: startTime,
        conversationStarted: startTime,
      });

      // Multiple updates
      for (let i = 2; i <= 5; i++) {
        const current = stateManager.getConversationMetadata();
        stateManager.updateConversationMetadata({
          ...current!,
          messageCount: i,
          lastActivity: new Date(),
        });
      }

      const metadata = stateManager.getConversationMetadata();
      expect(metadata?.conversationStarted).toEqual(startTime);
      expect(metadata?.messageCount).toBe(5);
    });
  });

  describe('State Integration', () => {
    it('should include metadata in state export', () => {
      const metadata: ConversationMetadata = {
        advisorSessionId: 'export-test',
        messageCount: 7,
        lastActivity: new Date(),
        conversationStarted: new Date(),
      };

      stateManager.updateConversationMetadata(metadata);
      const state = stateManager.getState();

      expect(state.conversationMetadata).toBeDefined();
      expect(state.conversationMetadata?.advisorSessionId).toBe('export-test');
      expect(state.conversationMetadata?.messageCount).toBe(7);
    });

    it('should handle state export without metadata', () => {
      const state = stateManager.getState();

      expect(state.conversationMetadata).toBeUndefined();
      expect(state.sessionId).toBeDefined();
      expect(state.currentStage).toBe('discovery');
    });
  });

  describe('Rapid Updates', () => {
    it('should handle rapid metadata updates', () => {
      // Simulate rapid updates (e.g., during fast conversation)
      for (let i = 0; i < 50; i++) {
        stateManager.updateConversationMetadata({
          advisorSessionId: 'rapid-test',
          messageCount: i,
          lastActivity: new Date(),
          conversationStarted: new Date('2025-01-15T10:00:00Z'),
        });
      }

      const metadata = stateManager.getConversationMetadata();
      expect(metadata?.messageCount).toBe(49);
    });
  });
});
