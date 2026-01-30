// Headers that allow content on the same line (e.g. "Usage: myapp")
export const INLINE_HEADERS = new Set(["usage", "alias", "aliases"]);

// Headers that typically don't span across empty lines, signaling a block break
export const SINGLE_CHUNK_HEADERS = new Set([
  "usage",
  "alias",
  "aliases",
  "examples",
  "arguments",
  "environment",
  "notes",
]);

// Regex for detection
export const REGEX = {
  // Option definition: -s, --long <arg>
  OPTION:
    /^\s*(?:(-[a-zA-Z0-9]),?\s+)?(--[a-zA-Z0-9-]+)(?:[=\s]*)(<[^>]+>|\[[^\]]+\]|(?:[A-Z0-9_]+)(?=\s|$))?/,

  // Command definition: indent + name + args + spacing
  COMMAND: /^\s{2,}[a-zA-Z0-9](?:[a-zA-Z0-9._,-]|\s(?!\s))*(\s{2,}|\s*$)/,

  // Option-like line (for heuristics)
  IS_OPTION: /^\s*-{1,2}[a-zA-Z0-9]/,
};

export const META_HEADERS = new Set([
  "alias",
  "aliases",
  "examples",
  "arguments",
  "environment",
  "notes",
]);
