/**
 * Unit Tests - Interview Validator
 *
 * Tests validation functions for interview responses and requirements.
 */

import { describe, it, expect } from 'vitest';
import {
  validateResponse,
  validateResponseAgainstQuestion,
  validateStageCompletion,
  validateCompleteRequirements,
  validateAllResponses
} from '../../../src/lib/interview/validator.js';
import { QUESTIONS } from '../../../src/lib/interview/questions.js';
import { Response } from '../../../src/types/interview.js';
import {
  sampleInterviewResponses,
  invalidInterviewResponses
} from '../../fixtures/sample-responses.js';
import { sampleDataAnalystRequirements } from '../../fixtures/sample-requirements.js';

describe('Interview Validator', () => {
  describe('validateResponse', () => {
    it('should validate valid text response', () => {
      const response: Response = {
        questionId: 'q1_agent_name',
        value: 'Test Agent',
        timestamp: new Date()
      };
      const result = validateResponse(response);
      expect(result.success).toBe(true);
    });

    it('should reject empty text response', () => {
      const response: Response = {
        questionId: 'q1_agent_name',
        value: '',
        timestamp: new Date()
      };
      const result = validateResponse(response);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should validate boolean response', () => {
      const response: Response = {
        questionId: 'q8_file_access',
        value: true,
        timestamp: new Date()
      };
      const result = validateResponse(response);
      expect(result.success).toBe(true);
    });

    it('should validate multiselect response', () => {
      const response: Response = {
        questionId: 'q3_target_audience',
        value: ['Developers', 'Analysts'],
        timestamp: new Date()
      };
      const result = validateResponse(response);
      expect(result.success).toBe(true);
    });

    it('should reject empty multiselect array', () => {
      const response: Response = {
        questionId: 'q3_target_audience',
        value: [],
        timestamp: new Date()
      };
      const result = validateResponse(response);
      expect(result.success).toBe(false);
    });

    it('should reject invalid response structure', () => {
      const response: any = {
        questionId: 'q1_agent_name'
        // Missing value and timestamp
      };
      const result = validateResponse(response);
      expect(result.success).toBe(false);
    });
  });

  describe('validateResponseAgainstQuestion', () => {
    it('should validate text response against text question', () => {
      const question = QUESTIONS.find(q => q.id === 'q1_agent_name')!;
      const response: Response = {
        questionId: 'q1_agent_name',
        value: 'Test Agent',
        timestamp: new Date()
      };
      const result = validateResponseAgainstQuestion(response, question);
      expect(result.success).toBe(true);
    });

    it('should reject wrong type for text question', () => {
      const question = QUESTIONS.find(q => q.id === 'q1_agent_name')!;
      const response: Response = {
        questionId: 'q1_agent_name',
        value: true, // Wrong type
        timestamp: new Date()
      };
      const result = validateResponseAgainstQuestion(response, question);
      expect(result.success).toBe(false);
      expect(result.errors!.some(err => err.includes('expects a text response'))).toBe(true);
    });

    it('should validate choice response against options', () => {
      const question = QUESTIONS.find(q => q.id === 'q4_interaction_style')!;
      const response: Response = {
        questionId: 'q4_interaction_style',
        value: 'task-focused',
        timestamp: new Date()
      };
      const result = validateResponseAgainstQuestion(response, question);
      expect(result.success).toBe(true);
    });

    it('should reject invalid choice', () => {
      const question = QUESTIONS.find(q => q.id === 'q4_interaction_style')!;
      const response: Response = {
        questionId: 'q4_interaction_style',
        value: 'invalid-style',
        timestamp: new Date()
      };
      const result = validateResponseAgainstQuestion(response, question);
      expect(result.success).toBe(false);
      expect(result.errors!.some(err => err.includes('Valid options'))).toBe(true);
    });

    it('should validate multiselect against options', () => {
      const question = QUESTIONS.find(q => q.id === 'q3_target_audience')!;
      const response: Response = {
        questionId: 'q3_target_audience',
        value: ['Developers', 'Data Scientists'],
        timestamp: new Date()
      };
      const result = validateResponseAgainstQuestion(response, question);
      expect(result.success).toBe(true);
    });

    it('should reject invalid multiselect choices', () => {
      const question = QUESTIONS.find(q => q.id === 'q3_target_audience')!;
      const response: Response = {
        questionId: 'q3_target_audience',
        value: ['InvalidAudience'],
        timestamp: new Date()
      };
      const result = validateResponseAgainstQuestion(response, question);
      expect(result.success).toBe(false);
      expect(result.errors!.some(err => err.includes('invalid'))).toBe(true);
    });

    it('should enforce required field validation', () => {
      const question = QUESTIONS.find(q => q.id === 'q1_agent_name')!;
      const response: Response = {
        questionId: 'q1_agent_name',
        value: '',
        timestamp: new Date()
      };
      const result = validateResponseAgainstQuestion(response, question);
      expect(result.success).toBe(false);
    });

    it('should allow empty for optional fields', () => {
      const optionalQuestion = QUESTIONS.find(q => !q.required);
      if (optionalQuestion) {
        const response: Response = {
          questionId: optionalQuestion.id,
          value: '',
          timestamp: new Date()
        };
        const result = validateResponseAgainstQuestion(response, optionalQuestion);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('validateStageCompletion', () => {
    it('should validate complete discovery stage', () => {
      const discoveryResponses = sampleInterviewResponses.filter(r =>
        QUESTIONS.find(q => q.id === r.questionId)?.stage === 'discovery'
      );
      const result = validateStageCompletion('discovery', discoveryResponses);
      expect(result.success).toBe(true);
    });

    it('should reject incomplete stage', () => {
      const incompleteResponses: Response[] = [
        { questionId: 'q1_agent_name', value: 'Test', timestamp: new Date() }
        // Missing q2
      ];
      const result = validateStageCompletion('discovery', incompleteResponses);
      expect(result.success).toBe(false);
      expect(result.errors!.some(err => err.includes('has no response') || err.includes('Required question'))).toBe(true);
    });

    it('should allow missing optional questions', () => {
      const requiredResponses = sampleInterviewResponses.filter(r => {
        const question = QUESTIONS.find(q => q.id === r.questionId);
        return question?.required;
      });
      const result = validateAllResponses(requiredResponses);
      expect(result.success).toBe(true);
    });

    it('should validate all responses in stage', () => {
      const invalidStageResponses: Response[] = [
        { questionId: 'q1_agent_name', value: '', timestamp: new Date() }, // Invalid
        { questionId: 'q2_primary_outcome', value: 'Valid', timestamp: new Date() }
      ];
      const result = validateStageCompletion('discovery', invalidStageResponses);
      expect(result.success).toBe(false);
    });
  });

  describe('validateCompleteRequirements', () => {
    it('should validate complete requirements', () => {
      const result = validateCompleteRequirements(sampleDataAnalystRequirements);
      expect(result.success).toBe(true);
    });

    it('should reject missing required fields', () => {
      const incompleteRequirements: any = {
        ...sampleDataAnalystRequirements,
        name: '' // Missing name
      };
      const result = validateCompleteRequirements(incompleteRequirements);
      expect(result.success).toBe(false);
      expect(result.errors!.some(err => err.includes('name'))).toBe(true);
    });

    it('should validate capabilities structure', () => {
      const invalidRequirements: any = {
        ...sampleDataAnalystRequirements,
        capabilities: {
          // Missing required fields
          memory: 'short-term'
        }
      };
      const result = validateCompleteRequirements(invalidRequirements);
      expect(result.success).toBe(false);
    });

    it('should validate interaction style enum', () => {
      const invalidRequirements: any = {
        ...sampleDataAnalystRequirements,
        interactionStyle: 'invalid-style'
      };
      const result = validateCompleteRequirements(invalidRequirements);
      expect(result.success).toBe(false);
      expect(result.errors!.some(err => err.includes('interactionStyle'))).toBe(true);
    });
  });

  describe('validateAllResponses', () => {
    it('should validate array of valid responses', () => {
      const result = validateAllResponses(sampleInterviewResponses);
      expect(result.success).toBe(true);
    });

    it('should collect errors from multiple invalid responses', () => {
      const result = validateAllResponses(invalidInterviewResponses);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(1);
    });

    it('should validate responses against questions', () => {
      const unknownResponse: Response[] = [
        { questionId: 'unknown_question', value: 'test', timestamp: new Date() }
      ];
      const result = validateAllResponses(unknownResponse);
      expect(result.success).toBe(false);
      expect(result.errors!.some(err => err.includes('question'))).toBe(true);
    });
  });
});
