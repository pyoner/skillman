import { z } from "zod";

const Name = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only")
  .refine((s) => !s.startsWith("-") && !s.endsWith("-"), "Must not start or end with a hyphen")
  .refine((s) => !s.includes("--"), "Must not contain consecutive hyphens");

export const ProgramCommand = z.object({
  name: z.string(),
  description: z.string(),
  usage: z.string().optional(),
  aliases: z.array(z.string()).optional(),
});
export type ProgramCommand = z.infer<typeof ProgramCommand>;

export const ProgramOption = z.object({
  name: z.string(),
  short: z.string().optional(),
  long: z.string().optional(),
  description: z.string(),
  type: z.enum(["string", "number", "boolean", "array"]),
  defaultValue: z.any().optional(),
});
export type ProgramOption = z.infer<typeof ProgramOption>;

export const Program = z.object({
  name: z.string(),
  description: z.string(),
  version: z.string().optional(),
  usage: z.string().optional(),
  options: z.array(ProgramOption),
  commands: z.array(ProgramCommand),
});
export type Program = z.infer<typeof Program>;

export const AgentSkill = z.object({
  name: Name,
  description: z.string().min(1).max(1024),
  license: z.string().optional(),
  compatibility: z.string().min(1).max(500).optional(),
  metadata: z.record(z.string(), z.string()).optional(),
  "allowed-tools": z.string().optional(),
  body: z.string(),
  references: z.array(ProgramCommand).optional(),
});
export type AgentSkill = z.infer<typeof AgentSkill>;
