import { stripVTControlCharacters } from "node:util";
import { type Program, type ProgramOption, type ProgramCommand } from "./schema";

// --- Types ---

export type Meta = {
  lineNumber: number;
  raw: string;
};

type BaseContent<T, D> = {
  type: T;
  data: D;
  meta: Meta;
};

export type TextContent = BaseContent<"text", string>;
export type CommandContent = BaseContent<"command", ProgramCommand>;
export type OptionContent = BaseContent<"option", ProgramOption>;
export type Content = TextContent | CommandContent | OptionContent;

export type Block = {
  header: string;
  content: Content[];
  meta: Meta;
};

type RawBlock = {
  header: string | null;
  lines: string[];
  startLine: number;
};

type BlockType = "usage" | "options" | "commands" | "description";

// --- Constants ---

// Headers that allow content on the same line (e.g. "Usage: myapp")
const INLINE_HEADERS = new Set(["usage", "alias", "aliases"]);

// Headers that typically don't span across empty lines, signaling a block break
const SINGLE_CHUNK_HEADERS = new Set([
  "usage",
  "alias",
  "aliases",
  "examples",
  "arguments",
  "environment",
  "notes",
]);

// Regex for detection
const REGEX = {
  // Option definition: -s, --long <arg>
  OPTION:
    /^\s*(?:(-[a-zA-Z0-9]),?\s+)?(--[a-zA-Z0-9-]+)(?:[=\s]*)(<[^>]+>|\[[^\]]+\]|(?:[A-Z0-9_]+)(?=\s|$))?/,

  // Command definition: indent + name + args + spacing
  COMMAND: /^\s{2,}[a-zA-Z0-9](?:[a-zA-Z0-9._,-]|\s(?!\s))*(\s{2,}|\s*$)/,

  // Option-like line (for heuristics)
  IS_OPTION: /^\s*-{1,2}[a-zA-Z0-9]/,
};

// --- Helper Functions ---

export function stripAnsi(string: string): string {
  return stripVTControlCharacters(string);
}

function normalizeName(name: string): string {
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

function ensureDescription(desc: string, minLength: number = 1): string {
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

function isOptionLine(line: string): boolean {
  return REGEX.IS_OPTION.test(line);
}

function isCommandLine(line: string): boolean {
  if (isOptionLine(line)) return false;
  return REGEX.COMMAND.test(line);
}

function getIndent(line: string): number {
  let indent = 0;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === " ") indent++;
    else if (line[i] === "\t")
      indent += 2; // Treat tab as 2 spaces for heuristics
    else break;
  }
  return indent;
}

function detectHeader(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // 1. Colon Headers
  // Matches "Header Name:" optionally followed by text
  // Relaxed: Allow lower case start (e.g. "usage:")
  const colonMatch = trimmed.match(/^([a-zA-Z][a-zA-Z0-9\s-]+):(\s+(.*))?$/);
  if (colonMatch) {
    const headerName = colonMatch[1]!.trim();
    const hasContent = !!colonMatch[3];

    // If it's a known inline header, accept it even with content
    if (INLINE_HEADERS.has(headerName.toLowerCase())) {
      return headerName;
    }

    // Otherwise, require it to be standalone (no content after colon)
    if (!hasContent) {
      if (headerName.length < 50) return headerName;
    }

    return null; // Has content but not an allowed inline header -> Treat as text
  }

  // 2. Exact Headers (No Colon) - e.g. "DESCRIPTION" or "COMMANDS"
  // Strict: All Caps, no lower case letters (allow numbers/spaces)
  if (/^[A-Z0-9\s-]+$/.test(trimmed) && trimmed.length > 2 && trimmed.length < 50) {
    // Must not look like a flag (e.g. -V) or a command (leading spaces already trimmed)
    if (trimmed.startsWith("-")) return null;
    return trimmed;
  }

  return null;
}

// --- Parsing Logic ---

export function parseHelp(text: string): Block[] {
  text = stripAnsi(text);
  const lines = text.split("\n");

  const rawBlocks = groupLinesIntoBlocks(lines);
  return rawBlocks.map(parseRawBlock);
}

function groupLinesIntoBlocks(lines: string[]): RawBlock[] {
  const blocks: RawBlock[] = [];
  let currentHeader: string | null = null;
  let currentLines: string[] = [];
  let currentStartLine = 1;

  const flush = () => {
    if (currentLines.length > 0 || currentHeader) {
      blocks.push({
        header: currentHeader,
        lines: currentLines,
        startLine: currentStartLine,
      });
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    // If this is the start of a new block (and currentLines is empty), update startLine
    if (currentLines.length === 0 && !currentHeader) {
      currentStartLine = i + 1;
    }

    const trimmed = line.trim();

    // Handle block breaks on empty lines for specific sections
    if (currentHeader && !trimmed) {
      if (SINGLE_CHUNK_HEADERS.has(currentHeader.toLowerCase())) {
        flush();
        currentHeader = null;
        currentLines = [];
        // Next block starts at next line
        currentStartLine = i + 2; // i is empty line, so next is i+1. But loop increments i. Wait.
        // If we flush here, the empty line is consumed.
        // The next iteration will be i+1.
        // We need to ensure currentStartLine is set correctly for the next block.
        // We can just rely on the "if currentLines.length === 0" check at top of loop if we reset properly.
        continue;
      }
    }

    // Detect Header
    let detectedHeader = detectHeader(line);

    // Heuristic: Implicit Indentation Header (for Git-style)
    // If no explicit header, check if this line acts as a header for indented content
    // Refinement: Implicit headers must be top-level (indent < 2) to avoid capturing commands as headers
    if (
      !detectedHeader &&
      trimmed &&
      trimmed.length < 80 &&
      !trimmed.endsWith(".") &&
      !trimmed.endsWith(",")
    ) {
      const currentIndent = getIndent(line);

      if (currentIndent < 2) {
        // Lookahead for content with deeper indentation
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j]!;
          if (!nextLine.trim()) continue; // Skip empty lines

          const nextIndent = getIndent(nextLine);
          if (nextIndent >= currentIndent + 2) {
            detectedHeader = trimmed;
          }
          break; // Only check the immediate next non-empty line
        }
      }
    }

    if (detectedHeader) {
      flush();
      currentHeader = detectedHeader;
      currentLines = [line];
      currentStartLine = i + 1;
    } else {
      currentLines.push(line);
    }
  }

  flush();
  return blocks;
}

function detectBlockType(lines: string[], header: string | null): BlockType {
  // If lines are empty, rely on header or default
  if (lines.length === 0) return "description";

  // Content-based detection
  let optionLines = 0;
  let commandLines = 0;
  let nonEmptyLines = 0;

  for (const line of lines) {
    if (!line.trim()) continue;
    nonEmptyLines++;
    if (isOptionLine(line)) optionLines++;
    else if (isCommandLine(line)) commandLines++;
  }

  if (nonEmptyLines > 0) {
    if (optionLines >= nonEmptyLines * 0.3) return "options";
    if (commandLines >= nonEmptyLines * 0.3) return "commands";
  }

  // Fallback to header hint
  if (header?.toLowerCase() === "usage") return "usage";

  return "description";
}

function parseRawBlock(block: RawBlock): Block {
  // Map lines to include line numbers
  let linesToParse = block.lines.map((text, idx) => ({
    text,
    line: block.startLine + idx,
  }));

  // Clean header from first line if present
  if (block.header && linesToParse.length > 0) {
    const firstLine = linesToParse[0]!;
    const escapedHeader = block.header.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
    const headerRegex = new RegExp(`^\\s*${escapedHeader}(?:\\s*:)?`, "i");

    const match = firstLine.text.match(headerRegex);
    if (match) {
      const remaining = firstLine.text.slice(match[0].length).trim();
      if (remaining) {
        linesToParse[0]!.text = remaining;
      } else {
        linesToParse.shift();
      }
    }
  }

  // Detect type (skip header line for detection if we have a header)
  // We use the text for detection logic
  const linesForDetection = block.header ? block.lines.slice(1) : block.lines;
  const type = detectBlockType(linesForDetection, block.header);

  let content: Content[] = [];
  if (type === "options") {
    content = parseOptions(linesToParse);
  } else if (type === "commands") {
    content = parseCommands(linesToParse);
  } else {
    // Default to text, user requested filtering empty lines
    content = linesToParse
      .filter((l) => l.text.trim().length > 0)
      .map((l) => ({
        type: "text",
        data: l.text.trim(),
        meta: {
          lineNumber: l.line,
          raw: l.text,
        },
      }));
  }

  return {
    header: block.header || "Description",
    content,
    meta: {
      lineNumber: block.startLine,
      raw: block.lines.join("\n"),
    },
  };
}

// --- Content Parsers ---

type LineInfo = { text: string; line: number };

function parseOptions(lines: LineInfo[]): Content[] {
  const content: Content[] = [];
  let current: OptionContent | null = null;

  const pushCurrent = () => {
    if (current) {
      current.data.description = ensureDescription(current.data.description);
      content.push(current);
      current = null;
    }
  };

  for (const { text: line, line: lineNumber } of lines) {
    if (!line.trim()) continue;

    const match = line.match(REGEX.OPTION);
    if (match) {
      pushCurrent();
      const [, short, long, placeholder] = match;
      const remaining = line.slice(match[0].length).trim();

      current = {
        type: "option",
        data: {
          name: normalizeName(long!.replace(/^--/, "")),
          short: short?.replace(/^-/, ""),
          long: long!.replace(/^--/, ""),
          description: remaining,
          type: placeholder ? "string" : "boolean",
        },
        meta: {
          lineNumber: lineNumber,
          raw: line,
        },
      };
    } else if (current && line.trim() && line.startsWith(" ")) {
      // Continuation
      current.data.description += " " + line.trim();
      current.meta.raw += "\n" + line;
    } else {
      // Text fallback
      pushCurrent();
      content.push({
        type: "text",
        data: line.trim(),
        meta: {
          lineNumber: lineNumber,
          raw: line,
        },
      });
    }
  }
  pushCurrent();
  return content;
}

function parseCommands(lines: LineInfo[]): Content[] {
  const content: Content[] = [];
  let current: CommandContent | null = null;

  const pushCurrent = () => {
    if (current) {
      current.data.description = ensureDescription(current.data.description);
      content.push(current);
      current = null;
    }
  };

  for (const { text: line, line: lineNumber } of lines) {
    if (!line.trim()) {
      pushCurrent(); // Empty line breaks description for commands
      continue;
    }

    const parts = line.trim().split(/\s{2,}/);
    // Logic: Indented, looks like a command, not too long or complex to be text
    const isCommand =
      line.startsWith("  ") &&
      parts.length >= 2 &&
      !parts[0]!.includes(".") &&
      parts[0]!.split(/\s+/).length <= 3;

    if (isCommand) {
      pushCurrent();
      const name = parts[0]!.trim();
      current = {
        type: "command",
        data: {
          name: normalizeName(name),
          description: parts.slice(1).join("  ").trim(),
        },
        meta: {
          lineNumber: lineNumber,
          raw: line,
        },
      };
    } else if (current && line.startsWith(" ")) {
      // Continuation
      current.data.description += " " + line.trim();
      current.meta.raw += "\n" + line;
    } else {
      // Text fallback
      pushCurrent();
      content.push({
        type: "text",
        data: line.trim(),
        meta: {
          lineNumber: lineNumber,
          raw: line,
        },
      });
    }
  }
  pushCurrent();
  return content;
}

// --- Compiler ---

export function compileProgram(blocks: Block[]): Program {
  let name = "unknown";
  const descriptionParts: string[] = [];
  let version: string | undefined;
  let usage: string | undefined;
  const options: ProgramOption[] = [];
  const commands: ProgramCommand[] = [];

  const META_HEADERS = new Set([
    "alias",
    "aliases",
    "examples",
    "arguments",
    "environment",
    "notes",
  ]);

  for (const block of blocks) {
    const headerLower = block.header.toLowerCase();
    const isUsage = headerLower === "usage";
    const isMeta = META_HEADERS.has(headerLower);

    // Check if this block contains structured data
    const hasOptions = block.content.some((i) => i.type === "option");
    const hasCommands = block.content.some((i) => i.type === "command");
    const isDescriptionBlock = !isUsage && !isMeta && !hasOptions && !hasCommands;

    const blockText: string[] = [];

    for (const item of block.content) {
      if (item.type === "option") {
        options.push(item.data);
      } else if (item.type === "command") {
        commands.push(item.data);
      } else if (item.type === "text") {
        const text = item.data;

        // Version Detection
        if (!version) {
          const v = text.match(/v?(\d+\.\d+\.\d+)/);
          if (v) version = v[1];
        }

        // Usage Detection
        if (isUsage || text.toLowerCase().startsWith("usage:")) {
          const clean = text.replace(/^\s*usage:\s*/i, "").trim();
          if (clean) {
            usage = usage ? usage + "\n" + clean : clean;
            if (name === "unknown") {
              const n = clean.match(/^([a-zA-Z0-9-]+)/);
              if (n) name = n[1]!;
            }
          }
          continue; // Don't add usage to description
        }

        blockText.push(text);
      }
    }

    // Process Description
    if (blockText.length > 0 && isDescriptionBlock) {
      let text = blockText.join("\n");
      const isExplicitDesc = headerLower === "description";

      // Heuristic: Name extraction from first description line
      // e.g. "program - does something"
      if (descriptionParts.length === 0 && name === "unknown" && !text.includes(":")) {
        const firstLine = blockText[0]!;
        const parts = firstLine.split(/\s+-\s+|\s{2,}/);
        if (parts.length > 1) {
          name = normalizeName(parts[0]!);
          // Reconstruct without name
          const newFirstLine = parts.slice(1).join(" ");
          text = [newFirstLine, ...blockText.slice(1)].join("\n");
        }
      }

      if (!isExplicitDesc) {
        text = `${block.header}:\n${text}`;
      }
      descriptionParts.push(text);
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
