import { expect, test, describe } from "bun:test";
import { parseHelp, compileProgram } from "../src/lib/parser";

describe("Content Based Classification", () => {
  test("should classify unknown header as Options if content looks like options", () => {
    const helpText = `
Usage: mycli [options]

Custom Parameters:
  --foo      Do foo
  --bar      Do bar
`;
    const blocks = parseHelp(helpText);
    const parsed = compileProgram(blocks);
    expect(parsed.options).toHaveLength(2);
    expect(parsed.options.find((o) => o.long === "foo")).toBeTruthy();
    expect(parsed.options.find((o) => o.long === "bar")).toBeTruthy();
  });

  test("should classify unknown header as Commands if content looks like commands", () => {
    const helpText = `
Usage: mycli <command>

Extra Actions:
  start    Start the service
  stop     Stop the service
`;
    const blocks = parseHelp(helpText);
    const parsed = compileProgram(blocks);
    expect(parsed.commands).toHaveLength(2);
    expect(parsed.commands.find((c) => c.name === "start")).toBeTruthy();
    expect(parsed.commands.find((c) => c.name === "stop")).toBeTruthy();
  });

  test("should fall back to description if content is ambiguous", () => {
    const helpText = `
Usage: mycli

Important Note:
  This is just some text.
  It is not an option list.
`;
    const blocks = parseHelp(helpText);
    const parsed = compileProgram(blocks);
    // Should be part of description
    expect(parsed.description).toContain("Important Note:");
    expect(parsed.description).toContain("This is just some text.");
    // Should NOT be options or commands
    expect(parsed.options).toHaveLength(0);
    expect(parsed.commands).toHaveLength(0);
  });

  test("should handle headers without colons if content is strong", () => {
    const helpText = `
Usage: mycli

GLOBAL OPTIONS
  --verbose   Run verbosely
  --quiet     Run quietly
`;
    const blocks = parseHelp(helpText);
    const parsed = compileProgram(blocks);
    expect(parsed.options).toHaveLength(2);
    expect(parsed.options.find((o) => o.long === "verbose")).toBeTruthy();
  });
});
