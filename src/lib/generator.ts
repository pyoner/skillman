import { type Program } from "./schema";
import { AgentSkill } from "./schema";
import { renderSkillBody } from "./renderer";

export function generateSkill(program: Program): AgentSkill {
  const metadata: Record<string, string> = {};

  if (program.version) {
    metadata.version = program.version;
  }

  const skill: AgentSkill = {
    name: program.name,
    description: program.description,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    body: renderSkillBody(program),
    references: program.commands.length > 0 ? program.commands : undefined,
  };

  return AgentSkill.parse(skill);
}
