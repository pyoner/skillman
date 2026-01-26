import { z } from "zod";

const NameSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only")
  .refine(
    (s) => !s.startsWith("-") && !s.endsWith("-"),
    "Must not start or end with a hyphen",
  )
  .refine((s) => !s.includes("--"), "Must not contain consecutive hyphens");

export const PropertySchema = z.object({
  type: z.enum(["string", "number", "boolean", "array"]),
  description: z.string().min(1, "Description cannot be empty"),
  items: z
    .object({
      type: z.string(),
    })
    .optional(),
  enum: z.array(z.string()).optional(),
  default: z.any().optional(),
});

export const ToolParametersSchema = z.object({
  type: z.literal("object"),
  properties: z.record(z.string(), PropertySchema),
  required: z.array(z.string()).optional(),
});

export const ToolSchema = z.object({
  name: NameSchema,
  description: z.string().min(1),
  parameters: ToolParametersSchema,
});

/**
 * Agent Skill Specification (v1)
 * Based on SKILL_SPEC.md (agentskills.io/specification)
 */
export const AgentSkillSchema = z.object({
  name: NameSchema,
  description: z.string().min(1).max(1024),
  license: z.string().optional(),
  compatibility: z.string().min(1).max(500).optional(),
  metadata: z.record(z.string(), z.string()).optional(),
  "allowed-tools": z.string().optional(),
});

export const ParsedOptionSchema = z.object({
  name: z.string(),
  short: z.string().optional(),
  long: z.string().optional(),
  description: z.string(),
  type: z.enum(["string", "number", "boolean", "array"]),
  defaultValue: z.any().optional(),
});

export const ParsedCommandSchema = z.object({
  name: z.string(),
  description: z.string(),
  usage: z.string().optional(),
});

export const ParsedCLISchema = z.object({
  name: z.string(),
  description: z.string(),
  version: z.string().optional(),
  usage: z.string().optional(),
  options: z.array(ParsedOptionSchema),
  commands: z.array(ParsedCommandSchema),
});

export type Property = z.infer<typeof PropertySchema>;
export type ToolParameters = z.infer<typeof ToolParametersSchema>;
export type Tool = z.infer<typeof ToolSchema>;
export type AgentSkill = z.infer<typeof AgentSkillSchema>;
export type ParsedOption = z.infer<typeof ParsedOptionSchema>;
export type ParsedCommand = z.infer<typeof ParsedCommandSchema>;
export type ParsedCLI = z.infer<typeof ParsedCLISchema>;
