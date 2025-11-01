import { z, ZodSchema } from 'zod';
import type { AgentTemplate, ToolConfiguration, AgentCapabilities } from '../types/agent.js';

// Re-export core types for convenience
export type { AgentTemplate, ToolConfiguration, AgentCapabilities };

/**
 * Template categories for organizational purposes
 */
export type TemplateCategory =
  | 'data-processing'
  | 'creative'
  | 'analytical'
  | 'automation'
  | 'development';

/**
 * Tool schema definition with Zod validation
 */
export interface ToolSchemaDefinition {
  name: string;
  description: string;
  zodSchema: ZodSchema<any>;
  requiredPermissions: string[];
}

/**
 * Convert a Zod schema to a JSON-serializable parameters object
 * suitable for ToolConfiguration
 */
export function convertToolSchemaToConfig(
  name: string,
  description: string,
  zodSchema: ZodSchema<any>,
  requiredPermissions: string[]
): ToolConfiguration {
  // Extract the shape of the Zod schema for parameters
  // We convert it to a plain object description rather than storing the schema
  const parameters = zodSchemaToJsonSchema(zodSchema);

  return {
    name,
    description,
    parameters,
    requiredPermissions,
  };
}

/**
 * Convert Zod schema to JSON Schema-like object for serialization
 */
function zodSchemaToJsonSchema(schema: ZodSchema<any>): Record<string, unknown> {
  // For a Zod object schema, extract the shape
  const def = schema._def as any;

  if (def?.typeName === 'ZodObject') {
    const shape = typeof def.shape === 'function' ? def.shape() : def.shape;
    const properties: Record<string, any> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      const fieldSchema = value as ZodSchema<any>;
      properties[key] = describeZodField(fieldSchema);

      // Check if field is optional
      const fieldDef = (fieldSchema._def as any);
      if (fieldDef?.typeName !== 'ZodOptional') {
        required.push(key);
      }
    }

    return {
      type: 'object',
      properties,
      required,
    };
  }

  // Fallback for non-object schemas
  return { type: 'object', properties: {} };
}

/**
 * Describe a single Zod field as a JSON Schema property
 */
function describeZodField(field: ZodSchema<any>): Record<string, unknown> {
  const def = field._def as any;
  const typeName = def?.typeName;

  switch (typeName) {
    case 'ZodString':
      return { type: 'string' };
    case 'ZodNumber':
      return { type: 'number' };
    case 'ZodBoolean':
      return { type: 'boolean' };
    case 'ZodArray':
      return {
        type: 'array',
        items: describeZodField(def.type),
      };
    case 'ZodEnum':
      return {
        type: 'string',
        enum: def.values,
      };
    case 'ZodObject':
      return zodSchemaToJsonSchema(field);
    case 'ZodOptional':
      return {
        ...describeZodField(def.innerType),
        optional: true,
      };
    case 'ZodRecord':
      return {
        type: 'object',
        additionalProperties: true,
      };
    default:
      return { type: 'any' };
  }
}

/**
 * Template metadata for creating an AgentTemplate
 */
export interface TemplateMetadata {
  id: string;
  name: string;
  description: string;
  capabilityTags: string[];
  idealFor: string[];
  systemPrompt: string;
  requiredDependencies: string[];
  recommendedIntegrations: string[];
  starterCode?: string;
}

/**
 * Create an AgentTemplate from metadata and tool definitions
 */
export function createTemplate(
  metadata: TemplateMetadata,
  toolDefinitions: ToolSchemaDefinition[]
): AgentTemplate {
  // Convert tool definitions to tool configurations
  const defaultTools = toolDefinitions.map(tool =>
    convertToolSchemaToConfig(
      tool.name,
      tool.description,
      tool.zodSchema,
      tool.requiredPermissions
    )
  );

  return {
    id: metadata.id,
    name: metadata.name,
    description: metadata.description,
    capabilityTags: metadata.capabilityTags,
    idealFor: metadata.idealFor,
    systemPrompt: metadata.systemPrompt,
    defaultTools,
    requiredDependencies: metadata.requiredDependencies,
    recommendedIntegrations: metadata.recommendedIntegrations,
  };
}
