/**
 * Test Fixtures - Sample Interview Responses
 *
 * Provides pre-configured interview response sets for testing the interview flow.
 * Includes complete responses, partial responses for resume testing, and invalid
 * responses for validation testing.
 */

import { Response } from '../../src/types/interview.js';

/**
 * Complete set of 15 responses matching all questions in src/lib/interview/questions.ts.
 * This represents a successful interview completion for a data analysis agent.
 */
export const sampleInterviewResponses: Response[] = [
  { questionId: 'q1_agent_name', value: 'Test Agent', timestamp: new Date() },
  { questionId: 'q2_primary_outcome', value: 'Analyze data and generate reports', timestamp: new Date() },
  { questionId: 'q3_target_audience', value: ['Developers', 'Data Scientists'], timestamp: new Date() },
  { questionId: 'q4_interaction_style', value: 'task-focused', timestamp: new Date() },
  { questionId: 'q5_delivery_channels', value: ['CLI', 'API'], timestamp: new Date() },
  { questionId: 'q6_success_metrics', value: ['Accuracy', 'Speed'], timestamp: new Date() },
  { questionId: 'q7_memory_needs', value: 'short-term', timestamp: new Date() },
  { questionId: 'q8_file_access', value: true, timestamp: new Date() },
  { questionId: 'q9_web_access', value: false, timestamp: new Date() },
  { questionId: 'q10_code_execution', value: false, timestamp: new Date() },
  { questionId: 'q11_data_analysis', value: true, timestamp: new Date() },
  { questionId: 'q12_tool_integrations', value: 'PostgreSQL, Redis', timestamp: new Date() },
  { questionId: 'q13_runtime_preference', value: 'local', timestamp: new Date() },
  { questionId: 'q14_constraints', value: 'Budget under $1000/month', timestamp: new Date() },
  { questionId: 'q15_additional_notes', value: 'Focus on performance', timestamp: new Date() }
];

/**
 * Incomplete response set (first 8 questions only) for testing resume functionality.
 * Represents an interrupted interview session in the middle of the requirements stage.
 */
export const partialInterviewResponses: Response[] = [
  { questionId: 'q1_agent_name', value: 'Partial Agent', timestamp: new Date() },
  { questionId: 'q2_primary_outcome', value: 'Process data efficiently', timestamp: new Date() },
  { questionId: 'q3_target_audience', value: ['Analysts'], timestamp: new Date() },
  { questionId: 'q4_interaction_style', value: 'task-focused', timestamp: new Date() },
  { questionId: 'q5_delivery_channels', value: ['CLI'], timestamp: new Date() },
  { questionId: 'q6_success_metrics', value: ['Speed'], timestamp: new Date() },
  { questionId: 'q7_memory_needs', value: 'none', timestamp: new Date() },
  { questionId: 'q8_file_access', value: true, timestamp: new Date() }
];

/**
 * Invalid response set for testing validation.
 * Contains various validation errors: empty strings, invalid enums, empty arrays.
 */
export const invalidInterviewResponses: Response[] = [
  { questionId: 'q1_agent_name', value: '', timestamp: new Date() }, // Empty required field
  { questionId: 'q2_primary_outcome', value: '', timestamp: new Date() }, // Empty required field
  { questionId: 'q3_target_audience', value: [], timestamp: new Date() }, // Empty array for required multiselect
  { questionId: 'q4_interaction_style', value: 'invalid-style', timestamp: new Date() }, // Invalid enum
  { questionId: 'q5_delivery_channels', value: [], timestamp: new Date() }, // Empty array
  { questionId: 'q6_success_metrics', value: [], timestamp: new Date() }, // Empty array
  { questionId: 'q7_memory_needs', value: 'invalid-memory', timestamp: new Date() }, // Invalid enum
  { questionId: 'q8_file_access', value: 'not-a-boolean', timestamp: new Date() }, // Wrong type
  { questionId: 'q9_web_access', value: 'not-a-boolean', timestamp: new Date() }, // Wrong type
  { questionId: 'q10_code_execution', value: 'not-a-boolean', timestamp: new Date() }, // Wrong type
  { questionId: 'q11_data_analysis', value: 'not-a-boolean', timestamp: new Date() }, // Wrong type
  { questionId: 'q12_tool_integrations', value: '', timestamp: new Date() },
  { questionId: 'q13_runtime_preference', value: 'invalid-runtime', timestamp: new Date() }, // Invalid enum
  { questionId: 'q14_constraints', value: '', timestamp: new Date() },
  { questionId: 'q15_additional_notes', value: '', timestamp: new Date() }
];

/**
 * Helper function to create appropriate responses for a given template ID.
 * Generates responses that should result in classification to the specified template.
 *
 * @param templateId - The target template ID ('data-analyst', 'content-creator', etc.)
 * @returns Response array designed to match the specified template
 */
export function createResponsesForTemplate(templateId: string): Response[] {
  const baseTimestamp = new Date();

  switch (templateId) {
    case 'data-analyst':
      return [
        { questionId: 'q1_agent_name', value: 'Data Analyst Agent', timestamp: baseTimestamp },
        { questionId: 'q2_primary_outcome', value: 'Analyze CSV data and generate statistical reports', timestamp: baseTimestamp },
        { questionId: 'q3_target_audience', value: ['Data analysts', 'Business intelligence teams'], timestamp: baseTimestamp },
        { questionId: 'q4_interaction_style', value: 'task-focused', timestamp: baseTimestamp },
        { questionId: 'q5_delivery_channels', value: ['CLI', 'API'], timestamp: baseTimestamp },
        { questionId: 'q6_success_metrics', value: ['Report accuracy', 'Processing speed'], timestamp: baseTimestamp },
        { questionId: 'q7_memory_needs', value: 'short-term', timestamp: baseTimestamp },
        { questionId: 'q8_file_access', value: true, timestamp: baseTimestamp },
        { questionId: 'q9_web_access', value: false, timestamp: baseTimestamp },
        { questionId: 'q10_code_execution', value: false, timestamp: baseTimestamp },
        { questionId: 'q11_data_analysis', value: true, timestamp: baseTimestamp },
        { questionId: 'q12_tool_integrations', value: '', timestamp: baseTimestamp },
        { questionId: 'q13_runtime_preference', value: 'local', timestamp: baseTimestamp },
        { questionId: 'q14_constraints', value: '', timestamp: baseTimestamp },
        { questionId: 'q15_additional_notes', value: 'Need visualization support', timestamp: baseTimestamp }
      ];

    case 'content-creator':
      return [
        { questionId: 'q1_agent_name', value: 'Content Creator Agent', timestamp: baseTimestamp },
        { questionId: 'q2_primary_outcome', value: 'Write SEO-optimized blog posts and articles', timestamp: baseTimestamp },
        { questionId: 'q3_target_audience', value: ['Content marketers', 'Bloggers'], timestamp: baseTimestamp },
        { questionId: 'q4_interaction_style', value: 'conversational', timestamp: baseTimestamp },
        { questionId: 'q5_delivery_channels', value: ['Web Application'], timestamp: baseTimestamp },
        { questionId: 'q6_success_metrics', value: ['Content quality', 'SEO score'], timestamp: baseTimestamp },
        { questionId: 'q7_memory_needs', value: 'none', timestamp: baseTimestamp },
        { questionId: 'q8_file_access', value: false, timestamp: baseTimestamp },
        { questionId: 'q9_web_access', value: true, timestamp: baseTimestamp },
        { questionId: 'q10_code_execution', value: false, timestamp: baseTimestamp },
        { questionId: 'q11_data_analysis', value: false, timestamp: baseTimestamp },
        { questionId: 'q12_tool_integrations', value: '', timestamp: baseTimestamp },
        { questionId: 'q13_runtime_preference', value: 'cloud', timestamp: baseTimestamp },
        { questionId: 'q14_constraints', value: '', timestamp: baseTimestamp },
        { questionId: 'q15_additional_notes', value: 'Support multiple formats', timestamp: baseTimestamp }
      ];

    case 'code-assistant':
      return [
        { questionId: 'q1_agent_name', value: 'Code Assistant Agent', timestamp: baseTimestamp },
        { questionId: 'q2_primary_outcome', value: 'Review code and suggest improvements', timestamp: baseTimestamp },
        { questionId: 'q3_target_audience', value: ['Developers', 'Engineering teams'], timestamp: baseTimestamp },
        { questionId: 'q4_interaction_style', value: 'collaborative', timestamp: baseTimestamp },
        { questionId: 'q5_delivery_channels', value: ['IDE Extension', 'CLI'], timestamp: baseTimestamp },
        { questionId: 'q6_success_metrics', value: ['Issue detection rate', 'Code quality improvement'], timestamp: baseTimestamp },
        { questionId: 'q7_memory_needs', value: 'short-term', timestamp: baseTimestamp },
        { questionId: 'q8_file_access', value: true, timestamp: baseTimestamp },
        { questionId: 'q9_web_access', value: false, timestamp: baseTimestamp },
        { questionId: 'q10_code_execution', value: true, timestamp: baseTimestamp },
        { questionId: 'q11_data_analysis', value: false, timestamp: baseTimestamp },
        { questionId: 'q12_tool_integrations', value: 'GitHub', timestamp: baseTimestamp },
        { questionId: 'q13_runtime_preference', value: 'local', timestamp: baseTimestamp },
        { questionId: 'q14_constraints', value: '', timestamp: baseTimestamp },
        { questionId: 'q15_additional_notes', value: 'Support multiple languages', timestamp: baseTimestamp }
      ];

    case 'research-agent':
      return [
        { questionId: 'q1_agent_name', value: 'Research Agent', timestamp: baseTimestamp },
        { questionId: 'q2_primary_outcome', value: 'Find and verify information from web sources', timestamp: baseTimestamp },
        { questionId: 'q3_target_audience', value: ['Researchers', 'Journalists'], timestamp: baseTimestamp },
        { questionId: 'q4_interaction_style', value: 'task-focused', timestamp: baseTimestamp },
        { questionId: 'q5_delivery_channels', value: ['CLI', 'Web Application'], timestamp: baseTimestamp },
        { questionId: 'q6_success_metrics', value: ['Source credibility', 'Information accuracy'], timestamp: baseTimestamp },
        { questionId: 'q7_memory_needs', value: 'long-term', timestamp: baseTimestamp },
        { questionId: 'q8_file_access', value: false, timestamp: baseTimestamp },
        { questionId: 'q9_web_access', value: true, timestamp: baseTimestamp },
        { questionId: 'q10_code_execution', value: false, timestamp: baseTimestamp },
        { questionId: 'q11_data_analysis', value: false, timestamp: baseTimestamp },
        { questionId: 'q12_tool_integrations', value: '', timestamp: baseTimestamp },
        { questionId: 'q13_runtime_preference', value: 'cloud', timestamp: baseTimestamp },
        { questionId: 'q14_constraints', value: '', timestamp: baseTimestamp },
        { questionId: 'q15_additional_notes', value: 'Focus on fact verification', timestamp: baseTimestamp }
      ];

    case 'automation-agent':
      return [
        { questionId: 'q1_agent_name', value: 'Automation Agent', timestamp: baseTimestamp },
        { questionId: 'q2_primary_outcome', value: 'Schedule and execute automated workflows', timestamp: baseTimestamp },
        { questionId: 'q3_target_audience', value: ['Operations teams', 'DevOps engineers'], timestamp: baseTimestamp },
        { questionId: 'q4_interaction_style', value: 'task-focused', timestamp: baseTimestamp },
        { questionId: 'q5_delivery_channels', value: ['API', 'CLI'], timestamp: baseTimestamp },
        { questionId: 'q6_success_metrics', value: ['Task completion rate', 'Error rate'], timestamp: baseTimestamp },
        { questionId: 'q7_memory_needs', value: 'short-term', timestamp: baseTimestamp },
        { questionId: 'q8_file_access', value: true, timestamp: baseTimestamp },
        { questionId: 'q9_web_access', value: false, timestamp: baseTimestamp },
        { questionId: 'q10_code_execution', value: true, timestamp: baseTimestamp },
        { questionId: 'q11_data_analysis', value: false, timestamp: baseTimestamp },
        { questionId: 'q12_tool_integrations', value: 'Redis', timestamp: baseTimestamp },
        { questionId: 'q13_runtime_preference', value: 'local', timestamp: baseTimestamp },
        { questionId: 'q14_constraints', value: '', timestamp: baseTimestamp },
        { questionId: 'q15_additional_notes', value: 'Support cron schedules', timestamp: baseTimestamp }
      ];

    default:
      throw new Error(`Unknown template ID: ${templateId}`);
  }
}
