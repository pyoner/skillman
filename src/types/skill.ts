import { 
  type AgentSkill, 
  type Tool, 
  type ToolParameters, 
  type Property 
} from "./skill.schema";

export type { 
  AgentSkill, 
  Tool, 
  ToolParameters, 
  Property 
};

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
