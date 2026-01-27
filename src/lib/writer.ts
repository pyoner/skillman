import { join } from "node:path";
import remarkFrontmatter from "remark-frontmatter";
import { u } from "unist-builder";
import { type RootContent } from "mdast";
import { generateSkill } from "./generator";
import {
  createSkillAst,
  createMarkdownProcessor,
  renderSkillBody,
} from "./renderer";
import { type CrawledSkill } from "./crawler";

export async function saveSkill(
  crawled: CrawledSkill,
  outDir: string = ".",
): Promise<string> {
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

  // Create the skill object to get metadata
  const skillObj = generateSkill(crawled.main.program, crawled.main.raw);

  // Construct Frontmatter Object
  const frontmatterData: Record<string, any> = {
    name: skillObj.name,
    description: skillObj.description,
  };

  if (skillObj.metadata) {
    frontmatterData.metadata = skillObj.metadata;
  }

  // Create YAML node manually since we don't have a specific yaml-builder
  // remark-frontmatter parses 'yaml' nodes but we need to construct the text content
  const yamlContent = Object.entries(frontmatterData)
    .map(([key, value]) => {
      if (typeof value === "object") {
        const nested = Object.entries(value)
          .map(([k, v]) => `  ${k}: ${JSON.stringify(v)}`)
          .join("\n");
        return `${key}:\n${nested}`;
      }
      return `${key}: ${value}`;
    })
    .join("\n");

  const yamlNode = u("yaml", yamlContent) as RootContent;

  // Build the full AST for SKILL.md
  const bodyAst = createSkillAst(
    crawled.main.program,
    crawled.main.raw,
    refLinks,
  );
  bodyAst.children.unshift(yamlNode);

  // Process with unified + remark-frontmatter
  const processor = createMarkdownProcessor().use(remarkFrontmatter, ["yaml"]);
  const fileContent = processor.stringify(bodyAst);

  // Write SKILL.md
  await Bun.write(join(skillDir, "SKILL.md"), fileContent);

  // Write References
  for (const ref of crawled.references) {
    const refBody = renderSkillBody(ref.program, ref.raw);
    await Bun.write(join(refsDir, `${ref.name}.md`), refBody);
  }

  return skillDir;
}
