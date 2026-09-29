import { StructuredToolInterface, tool } from '@langchain/core/tools';
import { z } from 'zod';
import { SkillScannerService } from '../../skill/skill-scanner.service';
import { ToolRegistryService } from '../../tool/tool-registry.service';

type JsonSchema = Record<string, unknown>;

function jsonSchemaPropertyToZod(schema: JsonSchema): z.ZodTypeAny {
  if (!schema || typeof schema !== 'object' || Object.keys(schema).length === 0) {
    return z.unknown();
  }

  if (schema.type === 'object' || schema.properties) {
    const properties = (schema.properties ?? {}) as Record<string, JsonSchema>;
    const required = new Set(
      Array.isArray(schema.required) ? schema.required as string[] : [],
    );
    const shape: Record<string, z.ZodTypeAny> = {};

    for (const [key, propertySchema] of Object.entries(properties)) {
      const propertyZod = jsonSchemaPropertyToZod(propertySchema);
      shape[key] = required.has(key) ? propertyZod : propertyZod.optional();
    }

    const objectSchema = z.object(shape);
    if (schema.additionalProperties === true) {
      return objectSchema.passthrough();
    }

    return objectSchema;
  }

  if (schema.type === 'string') {
    let stringSchema = z.string();
    if (typeof schema.description === 'string') {
      stringSchema = stringSchema.describe(schema.description);
    }
    return stringSchema;
  }

  if (schema.type === 'array') {
    return z.array(jsonSchemaPropertyToZod((schema.items ?? {}) as JsonSchema));
  }

  if (schema.type === 'number' || schema.type === 'integer') {
    return z.number();
  }

  if (schema.type === 'boolean') {
    return z.boolean();
  }

  return z.unknown();
}

function jsonSchemaToZod(schema: JsonSchema): z.ZodObject<z.ZodRawShape> {
  const converted = jsonSchemaPropertyToZod(schema);
  if (converted instanceof z.ZodObject) {
    return converted;
  }

  return z.object({}).passthrough();
}

export function buildSkillStructuredTools(
  skillScannerService: SkillScannerService,
  skillNames: Set<string>,
): StructuredToolInterface[] {
  const tools: StructuredToolInterface[] = [];

  for (const name of skillNames) {
    const skill = skillScannerService.get(name);
    if (!skill) {
      continue;
    }

    tools.push(createStructuredTool(
      skill.name,
      skill.description,
      skill.inputSchema,
      async (input) => {
        const current = skillScannerService.get(skill.name);
        if (!current) {
          throw new Error(`skill not found: ${skill.name}`);
        }

        const result = await current.execute(input ?? {}, {});
        return JSON.stringify(result);
      },
    ));
  }

  return tools;
}

export function buildRegistryStructuredTools(
  toolRegistryService: ToolRegistryService,
  toolNames: Set<string>,
): StructuredToolInterface[] {
  const tools: StructuredToolInterface[] = [];

  for (const name of toolNames) {
    const toolDef = toolRegistryService.get(name);
    if (!toolDef) {
      continue;
    }

    tools.push(createStructuredTool(
      toolDef.name,
      toolDef.description,
      toolDef.inputSchema,
      async (input) => {
        const current = toolRegistryService.get(toolDef.name);
        if (!current) {
          throw new Error(`tool not found: ${toolDef.name}`);
        }

        const result = await current.execute(input ?? {});
        return JSON.stringify(result);
      },
    ));
  }

  return tools;
}

export function buildAgentStructuredTools(
  skillScannerService: SkillScannerService,
  toolRegistryService: ToolRegistryService,
  skillNames: Set<string>,
  toolNames: Set<string>,
): StructuredToolInterface[] {
  return [
    ...buildSkillStructuredTools(skillScannerService, skillNames),
    ...buildRegistryStructuredTools(toolRegistryService, toolNames),
  ];
}

export function buildAgentToolJsonSchemas(
  skillScannerService: SkillScannerService,
  toolRegistryService: ToolRegistryService,
  skillNames: Set<string>,
  toolNames: Set<string>,
): Record<string, unknown>[] {
  const schemas: Record<string, unknown>[] = [];

  for (const name of skillNames) {
    const skill = skillScannerService.get(name);
    if (!skill) {
      continue;
    }

    schemas.push({
      type: 'function',
      function: {
        name: skill.name,
        description: skill.description,
        parameters: skill.inputSchema,
      },
    });
  }

  for (const name of toolNames) {
    const toolDef = toolRegistryService.get(name);
    if (!toolDef) {
      continue;
    }

    schemas.push({
      type: 'function',
      function: {
        name: toolDef.name,
        description: toolDef.description,
        parameters: toolDef.inputSchema,
      },
    });
  }

  return schemas;
}

function createStructuredTool(
  name: string,
  description: string,
  inputSchema: JsonSchema,
  func: (input: Record<string, unknown>) => Promise<string>,
): StructuredToolInterface {
  const structuredTool = tool(
    async (input: Record<string, unknown>) => func(input ?? {}),
    {
      name,
      description,
      schema: jsonSchemaToZod(inputSchema) as never,
    },
  );

  return structuredTool as StructuredToolInterface;
}
