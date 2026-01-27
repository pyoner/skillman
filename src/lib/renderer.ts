import { type Program, type ProgramOption } from "./schema";

function renderOptions(options: ProgramOption[]): string {
  if (options.length === 0) return "";

  const header = `| Option | Description | Type | Default |
| :--- | :--- | :--- | :--- |`;

  const rows = options.map((opt) => {
    const names = [
      opt.short ? `-${opt.short}` : "",
      opt.long ? `--${opt.long}` : "",
    ]
      .filter(Boolean)
      .join(", ");
    
    // Escape pipes in description to prevent table breakage
    const description = opt.description.replace(/\|/g, "\\|");
    const type = opt.type;
    const defaultValue = opt.defaultValue !== undefined ? String(opt.defaultValue) : "";

    return `| \`${names}\` | ${description} | ${type} | ${defaultValue} |`;
  });

  return `### Options

${header}
${rows.join("\n")}
`;
}

export function renderSkillBody(
  program: Program,
  rawHelpText: string,
  references: { name: string; url: string }[] = []
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
