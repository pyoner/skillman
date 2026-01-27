import { join } from "node:path";
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

  // Build reference links
  const refLinks = crawled.references.map((ref) => ({
    name: ref.name,
    url: `references/${ref.name}.md`,
  }));

  // Generate main SKILL.md
  const mainBody = renderSkillBody(crawled.main.program, crawled.main.raw, refLinks);
  
  // Create the skill object
  const skillObj = generateSkill(crawled.main.program, crawled.main.raw);
  
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
    const refBody = renderSkillBody(ref.program, ref.raw);
    await Bun.write(join(refsDir, `${ref.name}.md`), refBody);
  }

  return skillDir;
}
