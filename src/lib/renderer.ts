import { type Program, type ProgramOption } from "./schema";

export function renderSkillBody(
  program: Program,
  rawHelpText: string,
  references: { name: string; url: string }[] = [],
): string {
  const sections: string[] = [];

  // Title and Description
  sections.push(`# ${program.name}`);
  sections.push("");
  sections.push(program.description);
  sections.push("");

  // Raw Help Text
  sections.push("```bash");
  sections.push(rawHelpText.trim());
  sections.push("```");
  sections.push("");

  // References (Footnotes)
  if (references.length > 0) {
    sections.push("## References");
    sections.push("");
    for (const ref of references) {
      sections.push(`- [${ref.name}](${ref.url})`);
    }
    sections.push("");
  }

  return sections.join("\n").trim();
}
