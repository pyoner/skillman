import {
  type ParsedCLI,
  type ParsedOption,
  type ParsedCommand,
} from "./schema";

function normalizeName(name: string): string {
  let normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (normalized.length === 0) return "unknown";

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

function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(
    /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
    "",
  );
}

export function parseHelp(text: string): ParsedCLI {
  text = stripAnsi(text);
  const lines = text.split("\n");
  let rawName = "unknown";
  let description = "";
  let version: string | undefined;
  const options: ParsedOption[] = [];
  const commands: ParsedCommand[] = [];

  const usageMatch = text.match(/Usage:\s+([a-zA-Z0-9-]+)/i);
  if (usageMatch) {
    rawName = usageMatch[1] || "unknown";
  }

  // Extract version if present (e.g., "1.3.5" or "v1.3.5")
  const versionMatch = text.match(/v?(\d+\.\d+\.\d+)/);
  if (versionMatch) {
    version = versionMatch[1];
  }

  const nonEmptyLines = lines.filter((line) => line.trim().length > 0);

  // Find description: look for the first line that doesn't start with "Usage" and has content
  for (const line of nonEmptyLines) {
    const trimmed = line.trim();
    if (!trimmed.toLowerCase().startsWith("usage:") && trimmed.length > 20) {
      description = trimmed;
      break;
    }
  }

  // Fallback description if the above logic fails
  if (!description && nonEmptyLines.length > 0) {
    description = nonEmptyLines[0]!.trim();
  }

  const optionRegex =
    /^\s*(-[a-zA-Z0-9])?,\s*(--[a-zA-Z0-9-]+)(?:[=\s]+(<[a-zA-Z0-9-]+>|\[[a-zA-Z0-9-]+\]))?\s+(.*)$/;
  const alternateOptionRegex =
    /^\s*(--[a-zA-Z0-9-]+)(?:[=\s]+(<[a-zA-Z0-9-]+>|\[[a-zA-Z0-9-]+\]))?\s+(.*)$/;
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
          type: placeholder ? "string" : "boolean",
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
            description: ensureDescription(cmdDesc.trim(), 10),
          });
        }
      }
    }
  }

  return {
    name: normalizeName(rawName),
    description: ensureDescription(description, 10),
    version,
    options,
    commands,
  };
}
