import { stripVTControlCharacters } from "node:util";
import { type Program, type ProgramOption, type ProgramCommand } from "./schema";

export function stripAnsi(string: string): string {
  return stripVTControlCharacters(string);
}

/**
 * Normalizes a name for the schema.
 * Handles comma-separated aliases by picking the last (usually full) name.
 * Keeps spaces for subcommands.
 */
function normalizeName(name: string): string {
  // Handle aliases like "i, install"
  if (name.includes(",")) {
    const parts = name.split(",").map((p) => p.trim());
    name = parts[parts.length - 1] || name;
  }

  let normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9-\s]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .trim();

  if (normalized.length === 0) return "unknown";

  normalized = normalized.slice(0, 64);

  return normalized;
}

function ensureDescription(desc: string, minLength: number = 1): string {
  desc = desc.trim().replace(/\s+/g, " ");
  if (desc.length === 0) return "No description available for this item.";
  if (desc.length < minLength) {
    return desc + " ".repeat(minLength - desc.length).replace(/ /g, ".");
  }
  // Truncate to avoid AgentSkill validation errors (max 1024)
  if (desc.length > 1024) {
    return desc.slice(0, 1021) + "...";
  }
  return desc;
}

function isOptionLine(line: string): boolean {
  return /^\s*-{1,2}[a-zA-Z0-9]/.test(line);
}

function isCommandLine(line: string): boolean {
  if (isOptionLine(line)) return false;
  // Matches indented command names (at least 2 spaces)
  // e.g. "  start   Start the server"
  return /^\s{2,}[a-zA-Z0-9][a-zA-Z0-9._-]*(\s{2,}|\s*$)/.test(line);
}

type BlockType = "usage" | "options" | "commands" | "description" | "meta";

function detectBlockTypeFromContent(lines: string[]): BlockType | null {
  let optionScore = 0;
  let commandScore = 0;
  let validLines = 0;

  for (const line of lines) {
    if (!line.trim()) continue;
    validLines++;
    if (isOptionLine(line)) optionScore++;
    else if (isCommandLine(line)) commandScore++;
  }

  if (validLines === 0) return null;

  // Heuristic: If significant portion matches a pattern
  // We use a lower threshold because descriptions often wrap
  if (optionScore > 0 && optionScore >= validLines * 0.3) return "options";
  if (commandScore > 0 && commandScore >= validLines * 0.3) return "commands";

  return null;
}

export function parseHelp(text: string): Program {
  text = stripAnsi(text);
  const lines = text.split("\n");

  const sectionMap: Record<string, BlockType> = {
    usage: "usage",
    options: "options",
    flags: "options",
    configuration: "options",
    commands: "commands",
    subcommands: "commands",
    alias: "meta",
    aliases: "meta",
    examples: "meta",
    arguments: "meta",
    environment: "meta",
    notes: "meta",
  };

  function classifyHeader(header: string): BlockType | null {
    header = header.toLowerCase();
    if (sectionMap[header]) return sectionMap[header]!;

    if (
      header.includes("dependencies") ||
      header.includes("scripts") ||
      header.includes("other") ||
      header.includes("review") ||
      header.includes("manage")
    ) {
      return "commands";
    }

    return null;
  }

    // Phase 1: Group lines into raw blocks based on headers
  const rawBlocks: { header: string | null; lines: string[] }[] = [];
  let currentHeader: string | null = null;
  let currentBlockLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Check if we should break the current block (Usage/Meta) on empty line
    if (currentHeader && !trimmed) {
      const currentType = classifyHeader(currentHeader);
      if (currentType === "usage" || currentType === "meta") {
        rawBlocks.push({ header: currentHeader, lines: currentBlockLines });
        currentHeader = null;
        currentBlockLines = [];
        continue;
      }
    }

    // Detect header:
    let isValidHeader = false;
    let headerText = "";

    const colonMatch = line.match(/^\s*([A-Z][a-zA-Z0-9\s-]+):/);
    const exactMatch = line.match(/^\s*([A-Z][a-zA-Z0-9\s-]+)\s*$/);

    if (colonMatch) {
      headerText = colonMatch[1]!.trim();
      // If it has a colon, we are fairly confident if it's not too long
      if (headerText.length < 50) isValidHeader = true;
    } else if (exactMatch) {
      headerText = exactMatch[1]!.trim();
      // If no colon, be stricter: All Caps or Known
      if (
        /^[A-Z0-9\s-]+$/.test(headerText) ||
        sectionMap[headerText.toLowerCase()]
      ) {
        isValidHeader = true;
      }
    }

    if (isValidHeader && headerText) {
      // Flush previous block
      if (currentBlockLines.length > 0 || currentHeader) {
        rawBlocks.push({ header: currentHeader, lines: currentBlockLines });
      }
      currentHeader = headerText;
      currentBlockLines = [line];
    } else {
      currentBlockLines.push(line);
    }
  }
  // Flush final block
  if (currentBlockLines.length > 0 || currentHeader) {
    rawBlocks.push({ header: currentHeader, lines: currentBlockLines });
  }

  // Phase 2: Classify blocks and extract data
  const blocks: { type: BlockType; content: string }[] = [];

  for (const block of rawBlocks) {
    let type: BlockType = "description";

    if (block.header) {
      // 1. Try explicit header classification
      const explicitType = classifyHeader(block.header);
      if (explicitType) {
        type = explicitType;
      } else {
        // 2. Try content-based classification
        // Skip the header line for content analysis
        const contentLines = block.lines.slice(1);
        const inferredType = detectBlockTypeFromContent(contentLines);
        if (inferredType) {
          type = inferredType;
        } else {
           // Fallback to description, or maybe meta if header looks like meta?
           // For now description is safe.
           type = "description";
        }
      }
    } else {
      // No header -> usually description or usage if it contains "Usage:"
      // Check if lines contain "Usage:"
      if (block.lines.some((l) => /^\s*usage:/i.test(l))) {
        type = "usage";
      } else {
        const inferredType = detectBlockTypeFromContent(block.lines);
        if (inferredType) {
          type = inferredType;
        }
      }
    }

    blocks.push({ type, content: block.lines.join("\n") });
  }

  // Phase 3: Parse specific blocks
  let name = "unknown";
  let descriptionParts: string[] = [];
  let version: string | undefined;
  let usage: string | undefined;
  const options: ProgramOption[] = [];
  const commands: ProgramCommand[] = [];

  for (const block of blocks) {
    const content = block.content.trim();
    if (!content) continue;

    // Version detection (global)
    if (!version) {
      const versionMatch = content.match(/v?(\d+\.\d+\.\d+)/);
      if (versionMatch) {
        version = versionMatch[1];
      }
    }

    switch (block.type) {
      case "usage": {
        const usageLines = content.split("\n");
        usage = usageLines.map((l) => l.replace(/^\s*usage:\s*/i, "").trim()).join("\n");
        const nameMatch = usage.match(/^([a-zA-Z0-9-]+)/);
        if (nameMatch) name = nameMatch[1]!;
        break;
      }
      case "options": {
        options.push(...parseOptionsBlock(content));
        break;
      }
      case "commands": {
        commands.push(...parseCommandsBlock(content));
        break;
      }
      case "description": {
        // If we haven't found name yet, try to find it in first line of description
        const lines = content.split("\n");
        const firstLine = lines[0]?.trim() || "";

        // Heuristic: "program - description"
        if (descriptionParts.length === 0 && !firstLine.includes(":") && lines.length === 1 && name === "unknown") {
            const parts = firstLine.split(/\s+-\s+|\s{2,}/);
            if (parts.length > 1) {
                name = normalizeName(parts[0]!);
                descriptionParts.push(parts.slice(1).join(" "));
                break;
            }
        }
        descriptionParts.push(content);
        break;
      }
    }
  }

  return {
    name: normalizeName(name),
    description: ensureDescription(descriptionParts.join("\n\n"), 10),
    version,
    usage,
    options,
    commands,
  };
}

function parseOptionsBlock(content: string): ProgramOption[] {
  const options: ProgramOption[] = [];
  const lines = content.split("\n").slice(1);
  let currentOpt: ProgramOption | null = null;

  // Regex breakdown:
  // 1. Optional short flag: (?:(-[a-zA-Z0-9]),?\s+)?
  // 2. Long flag: (--[a-zA-Z0-9-]+)
  // 3. Optional argument (captured in group 3):
  //    - Non-capturing separator: (?:[=\s]*) (allows space, =, or direct attachment)
  //    - Content: <...>, [...], or uppercase word (FILE, LOCALE)
  const optRegex = /^\s*(?:(-[a-zA-Z0-9]),?\s+)?(--[a-zA-Z0-9-]+)(?:[=\s]*)(<[^>]+>|\[[^\]]+\]|(?:[A-Z0-9_]+)(?=\s|$))?/;

  for (const line of lines) {
    const match = line.match(optRegex);
    if (match) {
      const remaining = line.slice(match[0].length).trim();
      const [, short, long, placeholder] = match;
      currentOpt = {
        name: normalizeName(long!.replace(/^--/, "")),
        short: short?.replace(/^-/, ""),
        long: long!.replace(/^--/, ""),
        description: remaining,
        type: placeholder ? "string" : "boolean",
      };
      options.push(currentOpt);
    } else if (currentOpt && line.trim() && line.startsWith(" ")) {
      currentOpt.description += " " + line.trim();
    }
  }

  options.forEach((o) => (o.description = ensureDescription(o.description)));
  return options;
}

function parseCommandsBlock(content: string): ProgramCommand[] {
  const commands: ProgramCommand[] = [];
  const lines = content.split("\n").slice(1);
  let currentCmd: ProgramCommand | null = null;

  for (const line of lines) {
    if (!line.trim()) {
      currentCmd = null;
      continue;
    }

    const parts = line.trim().split(/\s{2,}/);

    if (line.startsWith("  ") && parts.length >= 2) {
      const name = parts[0]!.trim();
      if (name.includes(".") || name.split(/\s+/).length > 3) {
        if (currentCmd) {
          currentCmd.description += " " + line.trim();
        }
        continue;
      }

      currentCmd = {
        name: normalizeName(name),
        description: parts.slice(1).join("  ").trim(),
      };
      commands.push(currentCmd);
    } else if (currentCmd && line.startsWith(" ")) {
      currentCmd.description += " " + line.trim();
    }
  }

  commands.forEach((c) => (c.description = ensureDescription(c.description)));
  return commands;
}
