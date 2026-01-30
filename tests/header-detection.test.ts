import { expect, test, describe } from "bun:test";
import { parseHelp } from "../src/lib/parser";

describe("Header Detection Rules", () => {
  test("detects 'Usage' as header (inline)", () => {
    const text = `Usage: mycli [opts]`;
    const blocks = parseHelp(text);
    const usageBlock = blocks.find((b) => b.header === "Usage");
    expect(usageBlock).toBeDefined();
    expect(usageBlock?.content[0]?.data).toBe("mycli [opts]");
  });

  test("detects 'Alias' as header (inline)", () => {
    const text = `Alias: mycli a`;
    const blocks = parseHelp(text);
    const block = blocks.find((b) => b.header === "Alias");
    expect(block).toBeDefined();
    expect(block?.content[0]?.data).toBe("mycli a");
  });

  test("detects standard section headers (standalone)", () => {
    const text = `
Options:
  -v
`.trim();
    const blocks = parseHelp(text);
    const block = blocks.find((b) => b.header === "Options");
    expect(block).toBeDefined();
  });

  test("detects ALL CAPS headers (standalone)", () => {
    const text = `
DESCRIPTION
  Some text
`.trim();
    const blocks = parseHelp(text);
    const block = blocks.find((b) => b.header === "DESCRIPTION");
    expect(block).toBeDefined();
  });

  test("ignores colon-lines that have trailing text (unless Usage/Alias)", () => {
    const text = `
Description:
  Note: This is just a note.
  But: This is also text.
`.trim();
    const blocks = parseHelp(text);
    // Should be one block: Description
    const descBlock = blocks.find((b) => b.header === "Description");
    expect(descBlock).toBeDefined();

    // The lines should be preserved as text within the description block
    const textContent = descBlock?.content.map((c) => c.raw).join("\n");
    expect(textContent).toContain("Note: This is just a note.");

    expect(blocks.find((b) => b.header === "Note")).toBeUndefined();
    expect(blocks.find((b) => b.header === "But")).toBeUndefined();
  });

  test("detects custom Title Case headers if standalone", () => {
    const text = `
My Custom Header:
  Content
`.trim();
    const blocks = parseHelp(text);
    expect(blocks.find((b) => b.header === "My Custom Header")).toBeDefined();
  });

  test("detects implicit headers via indentation (Git-style)", () => {
    const text = `
start a working area
   clone     Clone a repository
   init      Create an empty Git repository
`.trim();
    const blocks = parseHelp(text);
    const block = blocks.find((b) => b.header === "start a working area");
    expect(block).toBeDefined();
    expect(block?.content).toHaveLength(2);
    expect(block?.content[0]?.type).toBe("command");
  });

  test("does NOT detect implicit header if indentation is deep (Bun-style subcommands)", () => {
    const text = [
      "  run       ./my-script.ts       Execute a file with Bun",
      "            lint                 Run a package.json script",
    ].join("\n");

    // "run" is indented by 2. "lint" by 12.
    // Heuristic requires header indent < 2.
    // So "run..." should NOT be a header.
    const blocks = parseHelp(text);
    const runHeader = blocks.find((b) => b.header.includes("run"));
    expect(runHeader).toBeUndefined();

    // It should probably be parsed as text or description if no other header exists
    // (In this snippet, it will likely be Description)
    expect(blocks[0]?.header).toBe("Description");
  });
});
