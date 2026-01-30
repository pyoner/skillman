import { stripVTControlCharacters } from "node:util";
import { type Program, type ProgramOption, type ProgramCommand } from "./schema";

export type TextContent = { type: "text"; data: string; raw: string };
export type CommandContent = { type: "command"; data: ProgramCommand; raw: string };
export type OptionContent = { type: "option"; data: ProgramOption; raw: string };
export type Content = TextContent | CommandContent | OptionContent;

export type Block = {
  header: string;
  content: Content[];
};

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

export function parseHelp(text: string): Block[] {
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
      header.includes("manage") ||
      header.includes("commands")
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
      // Increased to 100 to support verbose headers like "These are common Git commands..."
      if (headerText.length < 100) isValidHeader = true;
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
  const blocks: Block[] = [];

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

    // Phase 3: Parse specific blocks content
    let content: Content[] = [];
    
    let linesToParse = [...block.lines];
    // If block.header is set, the first line is the header line.
    if (block.header && linesToParse.length > 0) {
       const firstLine = linesToParse[0]!;
       // Check if there is content after the header on the same line
       // We rely on the header detection logic that found this block.
       // Usually it's "Header:" or "Header".
       // We'll try to match and strip the header.
       
       let cleanedFirstLine = firstLine;
       // Escape regex special characters in header
       const escapedHeader = block.header.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
       const headerRegex = new RegExp(`^\\s*${escapedHeader}(?:\\s*:)?`, 'i');
       
       const match = firstLine.match(headerRegex);
       if (match) {
           cleanedFirstLine = firstLine.slice(match[0].length).trim();
       }
       
       if (cleanedFirstLine) {
           // Replace first line with cleaned content
           linesToParse[0] = cleanedFirstLine;
       } else {
           // No content on header line, remove it
           linesToParse.shift();
       }
    }

    if (type === "options") {
      content = parseOptionsBlockContent(linesToParse);
    } else if (type === "commands") {
      content = parseCommandsBlockContent(linesToParse);
    } else {
      // Default to TextContent
      // User said "Trim/Ignore" for TextContent.
      content = linesToParse
        .filter(l => l.trim().length > 0)
        .map(l => ({ type: "text", data: l.trim(), raw: l }));
    }

    blocks.push({
      header: block.header || "Description", // Default header if null
      content,
    });
  }

  return blocks;
}

function parseOptionsBlockContent(lines: string[]): Content[] {
  const content: Content[] = [];
  let currentOpt: OptionContent | null = null;

  const optRegex = /^\s*(?:(-[a-zA-Z0-9]),?\s+)?(--[a-zA-Z0-9-]+)(?:[=\s]*)(<[^>]+>|\[[^\]]+\]|(?:[A-Z0-9_]+)(?=\s|$))?/;

  for (const line of lines) {
    if (!line.trim()) continue;

    const match = line.match(optRegex);
    if (match) {
      // If we have a previous option, push it
      if (currentOpt) {
          currentOpt.data.description = ensureDescription(currentOpt.data.description);
          content.push(currentOpt);
      }

      const remaining = line.slice(match[0].length).trim();
      const [, short, long, placeholder] = match;
      currentOpt = {
        type: "option",
        data: {
          name: normalizeName(long!.replace(/^--/, "")),
          short: short?.replace(/^-/, ""),
          long: long!.replace(/^--/, ""),
          description: remaining,
          type: placeholder ? "string" : "boolean",
        },
        raw: line,
      };
    } else if (currentOpt && line.trim() && line.startsWith(" ")) {
      currentOpt.data.description += " " + line.trim();
      currentOpt.raw += "\n" + line;
    } else {
       // Not an option line, and not a continuation. Treat as text.
       if (currentOpt) {
          currentOpt.data.description = ensureDescription(currentOpt.data.description);
          content.push(currentOpt);
          currentOpt = null;
       }
       content.push({ type: "text", data: line.trim(), raw: line });
    }
  }

  if (currentOpt) {
    currentOpt.data.description = ensureDescription(currentOpt.data.description);
    content.push(currentOpt);
  }

  return content;
}

function parseCommandsBlockContent(lines: string[]): Content[] {
  const content: Content[] = [];
  let currentCmd: CommandContent | null = null;

  for (const line of lines) {
    if (!line.trim()) {
      if (currentCmd) {
        currentCmd.data.description = ensureDescription(currentCmd.data.description);
        content.push(currentCmd);
        currentCmd = null;
      }
      continue;
    }

    const parts = line.trim().split(/\s{2,}/);

    if (line.startsWith("  ") && parts.length >= 2) {
      const name = parts[0]!.trim();
      if (name.includes(".") || name.split(/\s+/).length > 3) {
         // Probably not a command, maybe continuation or text
        if (currentCmd) {
          currentCmd.data.description += " " + line.trim();
          currentCmd.raw += "\n" + line;
        } else {
           content.push({ type: "text", data: line.trim(), raw: line });
        }
        continue;
      }

      // Push previous command
      if (currentCmd) {
         currentCmd.data.description = ensureDescription(currentCmd.data.description);
         content.push(currentCmd);
      }

      currentCmd = {
        type: "command",
        data: {
          name: normalizeName(name),
          description: parts.slice(1).join("  ").trim(),
        },
        raw: line,
      };
    } else if (currentCmd && line.startsWith(" ")) {
      currentCmd.data.description += " " + line.trim();
      currentCmd.raw += "\n" + line;
    } else {
       // Not a command line
       if (currentCmd) {
         currentCmd.data.description = ensureDescription(currentCmd.data.description);
         content.push(currentCmd);
         currentCmd = null;
       }
       content.push({ type: "text", data: line.trim(), raw: line });
    }
  }

  if (currentCmd) {
    currentCmd.data.description = ensureDescription(currentCmd.data.description);
    content.push(currentCmd);
  }

  return content;
}

export function compileProgram(blocks: Block[]): Program {
  let name = "unknown";
  let descriptionParts: string[] = [];
  let version: string | undefined;
  let usage: string | undefined;
  const options: ProgramOption[] = [];
  const commands: ProgramCommand[] = [];

  const metaHeaders = ["alias", "aliases", "examples", "arguments", "environment", "notes"];
  // Section map keys that map to options/commands
  const structureHeaders = ["options", "flags", "configuration", "commands", "subcommands"];

  for (const block of blocks) {
    const headerLower = block.header.toLowerCase();
    const isUsage = headerLower === "usage";
    const isMeta = metaHeaders.includes(headerLower);
    const isStructure = structureHeaders.includes(headerLower) || 
                        headerLower.includes("commands") || // Catch-all for command variants
                        headerLower.includes("options");    // Catch-all?

    // But wait, "Custom Parameters" might be treated as options?
    // In detectBlockTypeFromContent, we inferred type.
    // parseHelp used inferred type to parse content.
    // But compileProgram sees a Block. It doesn't know the inferred type.
    
    // We should rely on what kind of content we have!
    // If we have OptionContent, we add options.
    // If we have CommandContent, we add commands.
    
    // The question is only about TextContent.
    // Should we add TextContent to description?
    
    let blockTextParts: string[] = [];

    for (const item of block.content) {
      if (item.type === "option") {
        options.push(item.data);
      } else if (item.type === "command") {
        commands.push(item.data);
      } else if (item.type === "text") {
         // Check for version in text
         if (!version) {
             const versionMatch = item.data.match(/v?(\d+\.\d+\.\d+)/);
             if (versionMatch) {
               version = versionMatch[1];
             }
         }
         
         // If header is Usage, extract usage
         if (isUsage || item.data.toLowerCase().startsWith("usage:")) {
             const text = item.data.replace(/^\s*usage:\s*/i, "").trim();
             if (text) {
                if (usage) usage += "\n" + text;
                else usage = text;
                
                // Try to extract name from usage
                 if (name === "unknown") {
                    const nameMatch = text.match(/^([a-zA-Z0-9-]+)/);
                    if (nameMatch) name = nameMatch[1]!;
                 }
             }
             // Don't add usage lines to description
             continue;
         }
         
         blockTextParts.push(item.data);
      }
    }

    // Process collected text for description
    if (blockTextParts.length > 0) {
        // We add to description ONLY if:
        // 1. It is NOT Usage block (handled above, but if there was extra text?)
        // 2. It is NOT Meta block
        // 3. It is NOT a structure block (Options/Commands) - unless we want intro text?
        //    Previous parser ignored text in structure blocks.
        
        // But what about "Custom Parameters" test case?
        // Header "Custom Parameters" is NOT in structureHeaders.
        // It contained Options.
        // So it's effectively an Options block.
        // Did previous parser add text from it to description?
        // detectBlockTypeFromContent -> "options".
        // parseHelp -> case "options".
        // content passed to parseOptionsBlock.
        // parseOptionsBlock ignored non-matching lines.
        // So NO text added to description.
        
        // So if a block contains Options or Commands, we should probably treat it as a structure block
        // and NOT add text to description?
        const hasOptions = block.content.some(i => i.type === "option");
        const hasCommands = block.content.some(i => i.type === "command");
        
        if (!isUsage && !isMeta && !hasOptions && !hasCommands) {
             // It's a description-like block.
             
             // Check if we should prepend header
             const isStandardDescription = headerLower === "description" || block.header === "Description";
             
             let text = blockTextParts.join("\n");
             
             // Heuristic for name in first description block
             if (descriptionParts.length === 0 && name === "unknown" && !text.includes(":")) {
                 const firstLine = blockTextParts[0]!;
                 const parts = firstLine.split(/\s+-\s+|\s{2,}/);
                 if (parts.length > 1) {
                     name = normalizeName(parts[0]!);
                     // Remove name part from text?
                     // Previous parser: descriptionParts.push(parts.slice(1).join(" "));
                     // It replaced the first line content.
                     
                     // Let's reconstruct text
                     const newFirstLine = parts.slice(1).join(" ");
                     blockTextParts[0] = newFirstLine;
                     text = blockTextParts.join("\n");
                 }
             }

             if (!isStandardDescription) {
                 text = `${block.header}:\n${text}`;
             }
             
             descriptionParts.push(text);
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
