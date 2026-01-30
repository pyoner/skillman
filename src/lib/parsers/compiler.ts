import type { Program } from "../schema";
import { META_HEADERS } from "./constants";
import { groupLinesIntoBlocks } from "./detectors";
import { parseRawBlock } from "./content";
import type { Block } from "./types";
import { ensureDescription, normalizeName, stripAnsi } from "./utils";

export function parseHelp(text: string): Block[] {
  text = stripAnsi(text);
  const lines = text.split("\n");

  const rawBlocks = groupLinesIntoBlocks(lines);
  return rawBlocks.map(parseRawBlock);
}

export function compileProgram(blocks: Block[]): Program {
  let name = "unknown";
  const descriptionParts: string[] = [];
  let version: string | undefined;
  let usage: string | undefined;
  const options: Program["options"] = [];
  const commands: Program["commands"] = [];

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
