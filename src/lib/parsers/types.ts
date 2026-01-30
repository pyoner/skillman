import type { ProgramOption, ProgramCommand } from "../schema";

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

export type RawBlock = {
  header: string | null;
  lines: string[];
  startLine: number;
};

export type BlockType = "usage" | "options" | "commands" | "description";

export type LineInfo = { text: string; line: number };
