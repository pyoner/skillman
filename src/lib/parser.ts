import { type ParsedCLI, type ParsedOption } from "../types/skill";

export function parseHelp(text: string): ParsedCLI {
  const lines = text.split("\n");
  let name = "unknown";
  let description = "";
  const options: ParsedOption[] = [];
  const commands: any[] = [];

  const usageMatch = text.match(/Usage:\s+(\w+)/i);
  if (usageMatch) {
    name = usageMatch[1] || "unknown";
  }

  const nonEmptyLines = lines.filter(line => line.trim().length > 0);
  if (nonEmptyLines.length > 1) {
    description = nonEmptyLines[1]!.trim();
  }

  const optionRegex = /^\s*(-[a-zA-Z0-9])?,\s*(--[a-zA-Z0-9-]+)(\s+<[a-zA-Z0-9-]+>|\[[a-zA-Z0-9-]+\])?\s+(.*)$/;
  const alternateOptionRegex = /^\s*(--[a-zA-Z0-9-]+)(\s+<[a-zA-Z0-9-]+>|\[[a-zA-Z0-9-]+\])?\s+(.*)$/;
  const commandRegex = /^\s+([a-z0-9-]+)\s+(.*)$/;

  let inCommandsSection = false;

  for (const line of lines) {
    if (line.match(/(Commands|Subcommands):/i)) {
      inCommandsSection = true;
      continue;
    }

    let match = line.match(optionRegex);
    if (!match) {
      match = line.match(alternateOptionRegex);
    }

    if (match) {
      const isAlt = match.length === 4;
      const short = isAlt ? undefined : match[1];
      const long = isAlt ? match[1] : match[2];
      const placeholder = isAlt ? match[2] : match[3];
      const desc = isAlt ? match[3] : match[4];

      if (long) {
          options.push({
            name: long.replace(/^--/, ""),
            short: short?.replace(/^-/, ""),
            long: long.replace(/^--/, ""),
            description: desc?.trim() || "",
            type: placeholder ? "string" : "boolean"
          });
      }
      continue;
    }

    if (inCommandsSection) {
      const cmdMatch = line.match(commandRegex);
      if (cmdMatch) {
        const cmdName = cmdMatch[1];
        const cmdDesc = cmdMatch[2];
        if (cmdName && cmdDesc) {
          commands.push({
            name: cmdName.trim(),
            description: cmdDesc.trim()
          });
        }
      }
    }
  }

  return {
    name,
    description,
    options,
    commands
  };
}
