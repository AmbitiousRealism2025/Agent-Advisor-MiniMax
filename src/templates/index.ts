/**
 * Agent Templates Barrel Export
 * Provides centralized access to all agent templates and utilities
 */

// Export all template instances
export { dataAnalystTemplate } from './data-analyst.js';
export { contentCreatorTemplate } from './content-creator.js';
export { codeAssistantTemplate } from './code-assistant.js';
export { researchAgentTemplate } from './research-agent.js';
export { automationAgentTemplate } from './automation-agent.js';

// Re-export shared types and utilities
export type {
  AgentTemplate,
  ToolConfiguration,
  AgentCapabilities,
  TemplateCategory,
  ToolSchemaDefinition,
} from './template-types.js';

export { createTemplate, convertToolSchemaToConfig } from './template-types.js';

// Import templates for registry
import { dataAnalystTemplate } from './data-analyst.js';
import { contentCreatorTemplate } from './content-creator.js';
import { codeAssistantTemplate } from './code-assistant.js';
import { researchAgentTemplate } from './research-agent.js';
import { automationAgentTemplate } from './automation-agent.js';

/**
 * Registry of all available agent templates
 */
export const ALL_TEMPLATES = [
  dataAnalystTemplate,
  contentCreatorTemplate,
  codeAssistantTemplate,
  researchAgentTemplate,
  automationAgentTemplate,
] as const;

/**
 * Total number of available templates
 */
export const TEMPLATE_COUNT = ALL_TEMPLATES.length;

/**
 * Unique template categories
 */
export const TEMPLATE_CATEGORIES = [
  'data-processing',
  'creative',
  'development',
  'analytical',
  'automation',
] as const;

/**
 * Template lookup by ID
 * @param id - Template identifier
 * @returns AgentTemplate if found, undefined otherwise
 */
export function getTemplateById(id: string) {
  return ALL_TEMPLATES.find((template) => template.id === id);
}

/**
 * Get templates by capability tag
 * @param tag - Capability tag to filter by
 * @returns Array of matching templates
 */
export function getTemplatesByCapability(tag: string) {
  return ALL_TEMPLATES.filter((template) => template.capabilityTags.includes(tag));
}

/**
 * Get all unique capability tags across all templates
 * @returns Array of unique capability tags
 */
export function getAllCapabilityTags(): string[] {
  const tags = new Set<string>();
  ALL_TEMPLATES.forEach((template) => {
    template.capabilityTags.forEach((tag) => tags.add(tag));
  });
  return Array.from(tags).sort();
}

/**
 * Template metadata summary
 */
export interface TemplateSummary {
  id: string;
  name: string;
  description: string;
  toolCount: number;
  capabilityTags: string[];
}

/**
 * Get summary information for all templates
 * @returns Array of template summaries
 */
export function getTemplateSummaries(): TemplateSummary[] {
  return ALL_TEMPLATES.map((template) => ({
    id: template.id,
    name: template.name,
    description: template.description,
    toolCount: template.defaultTools.length,
    capabilityTags: template.capabilityTags,
  }));
}

/**
 * Validate a template ID
 * @param id - Template ID to validate
 * @returns True if the template exists
 */
export function isValidTemplateId(id: string): boolean {
  return ALL_TEMPLATES.some((template) => template.id === id);
}
