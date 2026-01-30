import { REGEX } from "./constants";
import { detectBlockType } from "./detectors";
import type { Block, Content, LineInfo, RawBlock } from "./types";
import { ensureDescription, extractNames, normalizeName } from "./utils";

export function parseOptions(lines: LineInfo[]): Content[] {
  const content: Content[] = [];
  let current: Extract<Content, { type: "option" }> | null = null;

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

export function parseCommands(lines: LineInfo[]): Content[] {
  const content: Content[] = [];
  let current: Extract<Content, { type: "command" }> | null = null;

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
      const { name: mainName, aliases } = extractNames(name);
      current = {
        type: "command",
        data: {
          name: mainName,
          aliases: aliases.length > 0 ? aliases : undefined,
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

export function parseRawBlock(block: RawBlock): Block {
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
