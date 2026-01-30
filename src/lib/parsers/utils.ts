import { stripVTControlCharacters } from "node:util";
import { REGEX } from "./constants";

export function stripAnsi(string: string): string {
  return stripVTControlCharacters(string);
}

export function extractNames(name: string): { name: string; aliases: string[] } {
  let mainName = name;
  const aliases: string[] = [];

  if (name.includes(",")) {
    const parts = name.split(",").map((p) => p.trim());
    mainName = parts[parts.length - 1] || name;
    // All parts except the last one are aliases
    for (let i = 0; i < parts.length - 1; i++) {
      const alias = normalizeName(parts[i]!);
      if (alias && alias !== "unknown") {
        aliases.push(alias);
      }
    }
  }

  return { name: normalizeName(mainName), aliases };
}

export function normalizeName(name: string): string {
  if (name.includes(",")) {
    const parts = name.split(",").map((p) => p.trim());
    name = parts[parts.length - 1] || name;
  }

  const normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9-\s]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .trim();

  return normalized || "unknown";
}

export function ensureDescription(desc: string, minLength: number = 1): string {
  desc = desc.trim().replace(/\s+/g, " ");
  if (desc.length === 0) return "No description available for this item.";

  if (desc.length < minLength) {
    return desc + " ".repeat(minLength - desc.length).replace(/ /g, ".");
  }

  if (desc.length > 1024) {
    return desc.slice(0, 1021) + "...";
  }

  return desc;
}

export function isOptionLine(line: string): boolean {
  return REGEX.IS_OPTION.test(line);
}

export function isCommandLine(line: string): boolean {
  if (isOptionLine(line)) return false;
  return REGEX.COMMAND.test(line);
}

export function getIndent(line: string): number {
  let indent = 0;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === " ") indent++;
    else if (line[i] === "\t")
      indent += 2; // Treat tab as 2 spaces for heuristics
    else break;
  }
  return indent;
}
