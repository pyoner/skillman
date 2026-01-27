import { join } from "node:path";
import { type AgentSkill } from "./schema";
import { generateSkill } from "./generator";
import { renderSkillBody } from "./renderer";
import { type CrawledSkill } from "./crawler";

export async function saveSkill(crawled: CrawledSkill, outDir: string = "."): Promise<string> {
  const skillName = crawled.main.program.name;
  const skillDir = join(outDir, skillName);
  const refsDir = join(skillDir, "references");

  // Create directories
  await Bun.write(join(skillDir, ".keep"), ""); // Ensure dir exists
  if (crawled.references.length > 0) {
    await Bun.write(join(refsDir, ".keep"), "");
  }

  // Generate main SKILL.md
  // Use generateSkill to get the valid AgentSkill object structure
  // Pass linkToReferences: true to the renderer via generateSkill logic modification
  // Note: We need to manually construct the body with links for the main file
  const mainBody = renderSkillBody(crawled.main.program, { linkToReferences: true });
  
  // Create the skill object but override the body with the linked version
  const skillObj = generateSkill(crawled.main.program);
  skillObj.body = mainBody; // Override with linked body
  
  // Construct the SKILL.md file content
  const frontmatter = [
    "---",
    `name: ${skillObj.name}`,
    `description: ${skillObj.description}`,
  ];
  
  if (skillObj.metadata) {
    frontmatter.push("metadata:");
    for (const [key, val] of Object.entries(skillObj.metadata)) {
      frontmatter.push(`  ${key}: ${JSON.stringify(val)}`);
    }
  }
  
  frontmatter.push("---");
  frontmatter.push("");
  frontmatter.push(mainBody);
  
  // Write SKILL.md
  await Bun.write(join(skillDir, "SKILL.md"), frontmatter.join("\n"));

  // Write References
  for (const ref of crawled.references) {
    const refBody = renderSkillBody(ref.program);
    await Bun.write(join(refsDir, `${ref.name}.md`), refBody);
  }

  return skillDir;
}
