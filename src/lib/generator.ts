import { type AgentSkill, type ParsedCLI, type Tool } from "../types/skill";

export function generateSkill(parsed: ParsedCLI): AgentSkill {
  const tool: Tool = {
    name: parsed.name,
    description: parsed.description,
    parameters: {
      type: "object",
      properties: {},
      required: []
    }
  };

  for (const opt of parsed.options) {
    tool.parameters.properties[opt.name] = {
      type: opt.type,
      description: opt.description
    };
  }

  const tools: Tool[] = [tool];

  for (const cmd of parsed.commands) {
    tools.push({
      name: `${parsed.name}-${cmd.name}`,
      description: cmd.description,
      parameters: {
        type: "object",
        properties: {}
      }
    });
  }

  return {
    name: parsed.name,
    description: parsed.description,
    version: "1.0.0",
    tools
  };
}
