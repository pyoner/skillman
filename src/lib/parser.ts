import { type ParsedCLI, type ParsedOption } from "../types/skill";

function normalizeName(name: string): string {
  let normalized = name.toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  
  if (normalized.length === 0) return "unknown";
  
  // Truncate to 64 chars and ensure it doesn't end with a hyphen
  normalized = normalized.slice(0, 64).replace(/-+$/, "");
  
  return normalized;
}

function ensureDescription(desc: string, minLength: number = 10): string {
  desc = desc.trim();
  if (desc.length === 0) return "No description available for this item.";
  if (desc.length < minLength) {
    return desc + " ".repeat(minLength - desc.length).replace(/ /g, ".");
  }
  return desc;
}

export function parseHelp(text: string): ParsedCLI {
  const lines = text.split("\n");
  let rawName = "unknown";
  let description = "";
  const options: ParsedOption[] = [];
  const commands: any[] = [];

  const usageMatch = text.match(/Usage:\s+(\w+)/i);
  if (usageMatch) {
    rawName = usageMatch[1] || "unknown";
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
            name: normalizeName(long.replace(/^--/, "")),
            short: short?.replace(/^-/, ""),
            long: long.replace(/^--/, ""),
            description: ensureDescription(desc?.trim() || "", 1),
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
            name: normalizeName(cmdName.trim()),
            description: ensureDescription(cmdDesc.trim(), 10)
          });
        }
      }
    }
  }

  return {
    name: normalizeName(rawName),
    description: ensureDescription(description, 10),
    options,
    commands
  };
}
