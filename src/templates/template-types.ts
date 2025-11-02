import { z, ZodSchema } from 'zod';
import type { AgentTemplate, ToolConfiguration, AgentCapabilities } from '../types/agent.js';

// Re-export core types for convenience
export type { AgentTemplate, ToolConfiguration, AgentCapabilities };

/**
 * Cache JSON schema conversions per Zod schema instance.
 * Schemas are constructed at module load and remain static, so a WeakMap avoids
 * retaining entries across reloads while preventing redundant shape traversal.
 */
const schemaDescriptionCache = new WeakMap<ZodSchema<any>, Record<string, unknown>>();

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

interface ZodFieldAnalysis {
  baseSchema: ZodSchema<any>;
  isOptional: boolean;
  isNullable: boolean;
  hasDefault: boolean;
  defaultValue?: unknown;
  description?: string;
}

function resolveDefaultValue(def: any): unknown {
  if (typeof def?.defaultValue === 'function') {
    try {
      return def.defaultValue();
    } catch {
      return undefined;
    }
  }
  return def?.defaultValue;
}

function analyzeZodField(field: ZodSchema<any>): ZodFieldAnalysis {
  let current: ZodSchema<any> = field;
  let isOptional = false;
  let isNullable = false;
  let hasDefault = false;
  let defaultValue: unknown;
  let description: string | undefined = (field as any).description ?? (field._def as any)?.description;

  while (true) {
    const def = current._def as any;
    if (def?.description && !description) {
      description = def.description;
    }

    switch (def?.typeName) {
      case 'ZodOptional':
        isOptional = true;
        current = def.innerType;
        continue;
      case 'ZodDefault':
        isOptional = true;
        hasDefault = true;
        defaultValue = resolveDefaultValue(def);
        current = def.innerType;
        continue;
      case 'ZodNullable':
        isOptional = true;
        isNullable = true;
        current = def.innerType;
        continue;
      default:
        break;
    }

    break;
  }

  const baseDef = current._def as any;
  if (baseDef?.description && !description) {
    description = baseDef.description;
  }

  return {
    baseSchema: current,
    isOptional,
    isNullable,
    hasDefault,
    defaultValue,
    description,
  };
}

/**
 * Convert Zod schema to JSON Schema-like object for serialization
 */
function zodSchemaToJsonSchema(schema: ZodSchema<any>): Record<string, unknown> {
  const cached = schemaDescriptionCache.get(schema);
  if (cached) {
    return cached;
  }

  // For a Zod object schema, extract the shape
  const def = schema._def as any;

  if (def?.typeName === 'ZodObject') {
    const shape = typeof def.shape === 'function' ? def.shape() : def.shape;
    const properties: Record<string, any> = {};
    const required: string[] = [];

    const jsonSchema: Record<string, unknown> = {
      type: 'object',
      properties,
    };

    if (def?.description) {
      jsonSchema.description = def.description;
    }

    // Store placeholder before recursion to handle self-referential schemas
    schemaDescriptionCache.set(schema, jsonSchema);

    for (const [key, value] of Object.entries(shape)) {
      const fieldSchema = value as ZodSchema<any>;
      const analysis = analyzeZodField(fieldSchema);
      properties[key] = describeZodField(fieldSchema, analysis);

      if (!analysis.isOptional) {
        required.push(key);
      }
    }

    jsonSchema.required = required;

    return jsonSchema;
  }

  // Fallback for non-object schemas
  const fallback = { type: 'object', properties: {} };
  schemaDescriptionCache.set(schema, fallback);
  return fallback;
}

/**
 * Describe a single Zod field as a JSON Schema property
 */
function describeZodField(field: ZodSchema<any>, analysisOverride?: ZodFieldAnalysis): Record<string, unknown> {
  const cached = schemaDescriptionCache.get(field);
  if (cached) {
    return cached;
  }

  const analysis = analysisOverride ?? analyzeZodField(field);
  const baseDescription = { ...describeBaseSchema(analysis.baseSchema) };

  if (analysis.description) {
    baseDescription.description = analysis.description;
  }

  if (analysis.hasDefault) {
    baseDescription.default = analysis.defaultValue;
  }

  if (analysis.isNullable) {
    const typeValue = baseDescription.type;
    if (Array.isArray(typeValue)) {
      if (!typeValue.includes('null')) {
        baseDescription.type = [...typeValue, 'null'];
      }
    } else if (typeof typeValue !== 'undefined') {
      baseDescription.type = [typeValue, 'null'];
    } else {
      baseDescription.type = ['null'];
    }
  }

  if (analysis.isOptional) {
    baseDescription.optional = true;
  }

  schemaDescriptionCache.set(field, baseDescription);
  return baseDescription;
}

function describeBaseSchema(schema: ZodSchema<any>): Record<string, unknown> {
  const cached = schemaDescriptionCache.get(schema);
  if (cached) {
    return cached;
  }

  const def = schema._def as any;

  if (def?.typeName === 'ZodObject') {
    return zodSchemaToJsonSchema(schema);
  }

  let description: Record<string, unknown>;

  switch (def?.typeName) {
    case 'ZodString': {
      const stringDescription: Record<string, unknown> = { type: 'string' };
      if (Array.isArray(def.checks)) {
        for (const check of def.checks) {
          switch (check.kind) {
            case 'min':
              stringDescription.minLength = check.value;
              break;
            case 'max':
              stringDescription.maxLength = check.value;
              break;
            case 'length':
              stringDescription.minLength = check.value;
              stringDescription.maxLength = check.value;
              break;
            case 'email':
              stringDescription.format = 'email';
              break;
            case 'url':
              stringDescription.format = 'uri';
              break;
            case 'uuid':
              stringDescription.format = 'uuid';
              break;
            case 'cuid':
              stringDescription.format = 'cuid';
              break;
            case 'regex':
              stringDescription.pattern = check.regex?.source;
              break;
          }
        }
      }
      description = stringDescription;
      break;
    }
    case 'ZodNumber': {
      const numberDescription: Record<string, unknown> = { type: 'number' };
      if (Array.isArray(def.checks)) {
        for (const check of def.checks) {
          switch (check.kind) {
            case 'min':
              if (check.inclusive === false) {
                numberDescription.exclusiveMinimum = check.value;
              } else {
                numberDescription.minimum = check.value;
              }
              break;
            case 'max':
              if (check.inclusive === false) {
                numberDescription.exclusiveMaximum = check.value;
              } else {
                numberDescription.maximum = check.value;
              }
              break;
            case 'int':
              numberDescription.type = 'integer';
              break;
          }
        }
      }
      description = numberDescription;
      break;
    }
    case 'ZodBoolean':
      description = { type: 'boolean' };
      break;
    case 'ZodArray': {
      const arrayDescription: Record<string, unknown> = {
        type: 'array',
        items: describeZodField(def.type),
      };

      if (def?.minLength?.value !== undefined) {
        arrayDescription.minItems = def.minLength.value;
      }
      if (def?.maxLength?.value !== undefined) {
        arrayDescription.maxItems = def.maxLength.value;
      }

      description = arrayDescription;
      break;
    }
    case 'ZodEnum': {
      description = {
        type: 'string',
        enum: def.values,
        enumDescriptions: def.values?.map((value: unknown) => String(value)),
      };
      break;
    }
    case 'ZodLiteral': {
      const literalValue = def.value;
      description = {
        const: literalValue,
        type: typeof literalValue,
      };
      break;
    }
    case 'ZodRecord': {
      description = {
        type: 'object',
        additionalProperties: describeZodField(def.valueType ?? def.type),
      };
      break;
    }
    default:
      description = { type: 'any' };
  }

  if (def?.description) {
    description = { ...description, description: def.description };
  }

  schemaDescriptionCache.set(schema, description);
  return description;
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
