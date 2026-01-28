import { stripVTControlCharacters } from "node:util";
import { type Program, type ProgramOption, type ProgramCommand } from "./schema";

export function stripAnsi(string: string): string {
  return stripVTControlCharacters(string);
}

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

function ensureDescription(desc: string, minLength: number = 1): string {
  desc = desc.trim();
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
    commands: "commands",
    subcommands: "commands",
    alias: "meta",
    aliases: "meta",
    examples: "meta",
    arguments: "meta",
    environment: "meta",
    notes: "meta",
  };

  for (const line of lines) {
    const headerMatch = line.match(/^\s*(Usage|Options|Flags|Commands|Subcommands|Alias|Aliases|Examples|Arguments|Environment|Notes):/i);
    
    if (headerMatch) {
      if (currentLines.length > 0) {
        blocks.push({ type: currentType, content: currentLines.join("\n") });
      }
      
      const header = headerMatch[1]!.toLowerCase();
      currentType = sectionMap[header] || "meta";
      currentLines = [line];
    } else {
      // If we see an empty line after a usage/meta block, the next content should 
      // likely be treated as description unless it's a new header.
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
        usage = content.replace(/^\s*usage:\s*/i, "").trim();
        const nameMatch = usage.match(/^([a-zA-Z0-9-]+)/);
        if (nameMatch) name = nameMatch[1]!;
        break;
      }
      case "options": {
        const lines = content.split("\n");
        for (const line of lines.slice(1)) {
          const opt = parseOptionLine(line);
          if (opt) options.push(opt);
        }
        break;
      }
      case "commands": {
        const lines = content.split("\n");
        for (const line of lines.slice(1)) {
          const cmd = parseCommandLine(line);
          if (cmd) commands.push(cmd);
        }
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

function parseOptionLine(line: string): ProgramOption | null {
  // Matches: -s, --long <arg>  Description
  // or: --long  Description
  const regex = /^\s*(?:(-[a-zA-Z0-9]),?\s+)?(--[a-zA-Z0-9-]+)(?:[=\s]+(<[^>]+>|\[[^\]]+\]))?\s+(.*)$/;
  const match = line.match(regex);
  if (!match) return null;

  const [, short, long, placeholder, description] = match;
  if (!long) return null;

  return {
    name: normalizeName(long.replace(/^--/, "")),
    short: short?.replace(/^-/, ""),
    long: long.replace(/^--/, ""),
    description: ensureDescription(description || ""),
    type: placeholder ? "string" : "boolean",
  };
}

function parseCommandLine(line: string): ProgramCommand | null {
  // Matches: command  Description
  const regex = /^\s+([a-z0-9-]+)\s+(.*)$/;
  const match = line.match(regex);
  if (!match) return null;

  const [, cmdName, description] = match;
  if (!cmdName) return null;

  return {
    name: normalizeName(cmdName),
    description: ensureDescription(description || ""),
  };
}
