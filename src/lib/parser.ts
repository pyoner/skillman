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

export function parseHelp(text: string): Program {
  text = stripAnsi(text);
  const lines = text.split("\n");

  type BlockType = "usage" | "options" | "commands" | "description" | "meta";
  const blocks: { type: BlockType; content: string }[] = [];
  let currentLines: string[] = [];
  let currentType: BlockType = "description";

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
    
    if (header.includes("dependencies") || header.includes("scripts") || header.includes("other") || header.includes("review") || header.includes("manage")) {
      return "commands";
    }
    
    return null;
  }

  for (const line of lines) {
    const headerMatch = line.match(/^\s*([A-Z][a-zA-Z\s]+):/);
    const classification = headerMatch ? classifyHeader(headerMatch[1]!) : null;

    if (headerMatch && classification) {
      if (currentLines.length > 0) {
        blocks.push({ type: currentType, content: currentLines.join("\n") });
      }
      currentType = classification;
      currentLines = [line];
    } else {
      if (!line.trim() && (currentType === "usage" || currentType === "meta")) {
        if (currentLines.length > 0) {
          blocks.push({ type: currentType, content: currentLines.join("\n") });
        }
        currentType = "description";
        currentLines = [];
      } else {
        currentLines.push(line);
      }
    }
  }
  
  if (currentLines.length > 0) {
    blocks.push({ type: currentType, content: currentLines.join("\n") });
  }

  let name = "unknown";
  let descriptionParts: string[] = [];
  let version: string | undefined;
  let usage: string | undefined;
  const options: ProgramOption[] = [];
  const commands: ProgramCommand[] = [];

  for (const block of blocks) {
    const content = block.content.trim();
    if (!content) continue;

    if (!version) {
      const versionMatch = content.match(/v?(\d+\.\d+\.\d+)/);
      if (versionMatch) {
        version = versionMatch[1];
      }
    }

    switch (block.type) {
      case "usage": {
        const usageLines = content.split("\n");
        usage = usageLines.map(l => l.replace(/^\s*usage:\s*/i, "").trim()).join("\n");
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
        const lines = content.split("\n");
        const firstLine = lines[0]?.trim() || "";
        
        if (descriptionParts.length === 0 && !firstLine.includes(":") && lines.length === 1) {
          const parts = firstLine.split(/\s+-\s+|\s{2,}/);
          if (parts.length > 1) {
            if (name === "unknown") {
              name = normalizeName(parts[0]!);
            }
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

  const optRegex = /^\s*(?:(-[a-zA-Z0-9]),?\s+)?(--[a-zA-Z0-9-]+)(?:[=\s]+(<[^>]+>|\[[^\]]+\]))?/;

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

  options.forEach(o => o.description = ensureDescription(o.description));
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

  commands.forEach(c => c.description = ensureDescription(c.description));
  return commands;
}
