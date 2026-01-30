import { INLINE_HEADERS, SINGLE_CHUNK_HEADERS } from "./constants";
import { getIndent, isCommandLine, isOptionLine } from "./utils";
import type { BlockType, RawBlock } from "./types";

export function detectHeader(line: string): string | null {
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

export function detectBlockType(lines: string[], header: string | null): BlockType {
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

export function groupLinesIntoBlocks(lines: string[]): RawBlock[] {
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
