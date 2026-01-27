import { type Program, type ProgramOption, type ProgramCommand } from "./schema";

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

function renderCommands(commands: ProgramCommand[], linkToReferences: boolean = false): string {
  if (commands.length === 0) return "";

  const header = `| Command | Description | Usage |
| :--- | :--- | :--- |`;

  const rows = commands.map((cmd) => {
    const description = cmd.description.replace(/\|/g, "\\|");
    const usage = cmd.usage ? `\`${cmd.usage}\`` : "";
    
    let name = `\`${cmd.name}\``;
    if (linkToReferences) {
      name = `[${cmd.name}](references/${cmd.name}.md)`;
    }

    return `| ${name} | ${description} | ${usage} |`;
  });

  return `### Commands

${header}
${rows.join("\n")}
`;
}

export function renderSkillBody(program: Program, options: { linkToReferences?: boolean } = {}): string {
  const sections: string[] = [];

  // Title and Description
  sections.push(`# ${program.name}`);
  sections.push("");
  sections.push(program.description);
  sections.push("");

  // Usage
  if (program.usage) {
    sections.push("### Usage");
    sections.push("");
    sections.push("```bash");
    sections.push(program.usage);
    sections.push("```");
    sections.push("");
  }

  // Commands
  const commandsTable = renderCommands(program.commands, options.linkToReferences);
  if (commandsTable) {
    sections.push(commandsTable);
  }

  // Options
  const optionsTable = renderOptions(program.options);
  if (optionsTable) {
    sections.push(optionsTable);
  }

  return sections.join("\n").trim();
}
