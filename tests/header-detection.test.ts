
import { expect, test, describe } from "bun:test";
import { parseHelp } from "../src/lib/parser";

describe("Header Detection Rules", () => {
  test("detects 'Usage' as header (inline)", () => {
    const text = `Usage: mycli [opts]`;
    const blocks = parseHelp(text);
    const usageBlock = blocks.find(b => b.header === "Usage");
    expect(usageBlock).toBeDefined();
    expect(usageBlock?.content[0]?.data).toBe("mycli [opts]");
  });

  test("detects 'Alias' as header (inline)", () => {
    const text = `Alias: mycli a`;
    const blocks = parseHelp(text);
    const block = blocks.find(b => b.header === "Alias");
    expect(block).toBeDefined();
    expect(block?.content[0]?.data).toBe("mycli a");
  });

  test("detects standard section headers (standalone)", () => {
    const text = `
Options:
  -v
`.trim();
    const blocks = parseHelp(text);
    const block = blocks.find(b => b.header === "Options");
    expect(block).toBeDefined();
  });

  test("detects ALL CAPS headers (standalone)", () => {
    const text = `
DESCRIPTION
  Some text
`.trim();
    const blocks = parseHelp(text);
    const block = blocks.find(b => b.header === "DESCRIPTION");
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
    const descBlock = blocks.find(b => b.header === "Description");
    expect(descBlock).toBeDefined();
    
    // The lines should be preserved as text within the description block
    const textContent = descBlock?.content.map(c => c.raw).join("\n");
    expect(textContent).toContain("Note: This is just a note.");
    
    expect(blocks.find(b => b.header === "Note")).toBeUndefined();
    expect(blocks.find(b => b.header === "But")).toBeUndefined();
  });

  test("detects custom Title Case headers if standalone", () => {
    const text = `
My Custom Header:
  Content
`.trim();
    const blocks = parseHelp(text);
    expect(blocks.find(b => b.header === "My Custom Header")).toBeDefined();
  });
});
