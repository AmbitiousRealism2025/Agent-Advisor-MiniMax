/**
 * Agent Templates Barrel Export
 * Provides centralized access to all agent templates and utilities
 */

// Export all code template instances (DEPRECATED - use document templates instead)
/** @deprecated Use document templates instead. Will be removed once consumers migrate. */
export { dataAnalystTemplate } from './data-analyst.js';
/** @deprecated Use document templates instead. Will be removed once consumers migrate. */
export { contentCreatorTemplate } from './content-creator.js';
/** @deprecated Use document templates instead. Will be removed once consumers migrate. */
export { codeAssistantTemplate } from './code-assistant.js';
/** @deprecated Use document templates instead. Will be removed once consumers migrate. */
export { researchAgentTemplate } from './research-agent.js';
/** @deprecated Use document templates instead. Will be removed once consumers migrate. */
export { automationAgentTemplate } from './automation-agent.js';

// Export document template instances
export { dataAnalystDocumentTemplate } from './data-analyst.js';
export { contentCreatorDocumentTemplate } from './content-creator.js';
export { codeAssistantDocumentTemplate } from './code-assistant.js';
export { researchAgentDocumentTemplate } from './research-agent.js';
export { automationAgentDocumentTemplate } from './automation-agent.js';

// Re-export shared types and utilities
export type {
  AgentTemplate,
  ToolConfiguration,
  AgentCapabilities,
  TemplateCategory,
  ToolSchemaDefinition,
  DocumentTemplate,
  DocumentSection,
} from './template-types.js';

export { createTemplate, convertToolSchemaToConfig, createDocumentTemplate } from './template-types.js';

// Import code templates for registry (DEPRECATED)
import { dataAnalystTemplate } from './data-analyst.js';
import { contentCreatorTemplate } from './content-creator.js';
import { codeAssistantTemplate } from './code-assistant.js';
import { researchAgentTemplate } from './research-agent.js';
import { automationAgentTemplate } from './automation-agent.js';

// Import document templates for registry
import { dataAnalystDocumentTemplate } from './data-analyst.js';
import { contentCreatorDocumentTemplate } from './content-creator.js';
import { codeAssistantDocumentTemplate } from './code-assistant.js';
import { researchAgentDocumentTemplate } from './research-agent.js';
import { automationAgentDocumentTemplate } from './automation-agent.js';

/**
 * Registry of all available agent templates
 * @deprecated Use ALL_DOCUMENT_TEMPLATES instead. Will be removed once consumers migrate.
 */
export const ALL_TEMPLATES = [
  dataAnalystTemplate,
  contentCreatorTemplate,
  codeAssistantTemplate,
  researchAgentTemplate,
  automationAgentTemplate,
] as const;

/**
 * Registry of all available document templates
 */
export const ALL_DOCUMENT_TEMPLATES = [
  dataAnalystDocumentTemplate,
  contentCreatorDocumentTemplate,
  codeAssistantDocumentTemplate,
  researchAgentDocumentTemplate,
  automationAgentDocumentTemplate,
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
 * @deprecated Use getDocumentTemplateById instead. Will be removed once consumers migrate.
 */
export function getTemplateById(id: string) {
  return ALL_TEMPLATES.find((template) => template.id === id);
}

/**
 * Document template lookup by ID
 * @param id - Template identifier
 * @returns DocumentTemplate if found, undefined otherwise
 */
export function getDocumentTemplateById(id: string) {
  return ALL_DOCUMENT_TEMPLATES.find((template) => template.id === id);
}

/**
 * Get templates by capability tag
 * @param tag - Capability tag to filter by
 * @returns Array of matching templates
 * @deprecated Use getDocumentTemplatesByCapability instead. Will be removed once consumers migrate.
 */
export function getTemplatesByCapability(tag: string) {
  return ALL_TEMPLATES.filter((template) => template.capabilityTags.includes(tag));
}

/**
 * Get document templates by capability tag
 * @param tag - Capability tag to filter by
 * @returns Array of matching document templates
 */
export function getDocumentTemplatesByCapability(tag: string) {
  return ALL_DOCUMENT_TEMPLATES.filter((template) => template.capabilityTags.includes(tag));
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
 * Document template metadata summary
 */
export interface DocumentTemplateSummary {
  id: string;
  name: string;
  description: string;
  sectionCount: number;
  capabilityTags: string[];
}

/**
 * Get summary information for all templates
 * @returns Array of template summaries
 * @deprecated Use getDocumentTemplateSummaries instead. Will be removed once consumers migrate.
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
 * Get summary information for all document templates
 * @returns Array of document template summaries
 */
export function getDocumentTemplateSummaries(): DocumentTemplateSummary[] {
  return ALL_DOCUMENT_TEMPLATES.map((template) => ({
    id: template.id,
    name: template.name,
    description: template.description,
    sectionCount: Object.keys(template.documentSections).length,
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

/**
 * Validate a document template ID
 * @param id - Document template ID to validate
 * @returns True if the document template exists
 */
export function isValidDocumentTemplateId(id: string): boolean {
  return ALL_DOCUMENT_TEMPLATES.some(t => t.id === id);
}
