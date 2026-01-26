export interface AgentSkill {
  name: string;
  description: string;
  version: string;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, string>;
  "allowed-tools"?: string;
  tools: Tool[];
}

export interface Tool {
  name: string;
  description: string;
  parameters: ToolParameters;
}

export interface ToolParameters {
  type: "object";
  properties: Record<string, Property>;
  required?: string[];
}

export interface Property {
  type: "string" | "number" | "boolean" | "array";
  description: string;
  items?: {
    type: string;
  };
  enum?: string[];
  default?: any;
}

export interface ParsedCLI {
  name: string;
  description: string;
  version?: string;
  usage?: string;
  options: ParsedOption[];
  commands: ParsedCommand[];
}

export interface ParsedOption {
  name: string;
  short?: string;
  long?: string;
  description: string;
  type: "string" | "number" | "boolean" | "array";
  defaultValue?: any;
}

export interface ParsedCommand {
  name: string;
  description: string;
  usage?: string;
}
