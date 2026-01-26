import { 
  type AgentSkill, 
  type ParsedCLI
} from "../types/skill";
import { AgentSkillSchema } from "../types/skill.schema";

export function generateSkill(parsed: ParsedCLI): AgentSkill {
  const metadata: Record<string, string> = {};
  
  if (parsed.version) {
    metadata.version = parsed.version;
  }

  const skill: AgentSkill = {
    name: parsed.name,
    description: parsed.description,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined
  };

  return AgentSkillSchema.parse(skill);
}
