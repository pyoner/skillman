import { expect, test, describe } from "bun:test";
import { parseHelp } from "../src/lib/parser";

describe("Parser", () => {
  test("should parse simple help text", () => {
    const helpText = `
Usage: myprogram [options]

My tool description.

Options:
  -v, --verbose          Enable verbose logging
  -o, --output <path>    Output file path
  --version              Show version
    `;
    const parsed = parseHelp(helpText);

    expect(parsed.name).toBe("myprogram");
    expect(parsed.options).toHaveLength(3);

    const verbose = parsed.options.find((o) => o.long === "verbose");
    expect(verbose?.type).toBe("boolean");
    expect(verbose?.description).toBe("Enable verbose logging");

    const output = parsed.options.find((o) => o.long === "output");
    expect(output?.type).toBe("string");
    expect(output?.description).toBe("Output file path");
  });

  test("should parse subcommands", () => {
    const helpText = `
Usage: myprogram <command> [options]

My tool with subcommands.

Commands:
  build      Build the project
  deploy     Deploy to production
    `;
    const parsed = parseHelp(helpText);

    expect(parsed.commands).toHaveLength(2);
    expect(parsed.commands[0]?.name).toBe("build");
    expect(parsed.commands[0]?.description).toBe("Build the project");
    expect(parsed.commands[1]?.name).toBe("deploy");
    expect(parsed.commands[1]?.description).toBe("Deploy to production");
  });

  test("should strip ANSI escape codes", () => {
    const helpText = `
\u001b[0m\u001b[1m\u001b[35mUsage:\u001b[0m \u001b[1mbun\u001b[0m <command>

\u001b[1mBun\u001b[0m is a fast JavaScript runtime.
    `;
    const parsed = parseHelp(helpText);

    expect(parsed.name).toBe("bun");
    expect(parsed.description).toBe("Bun is a fast JavaScript runtime.");
    expect(parsed.description).not.toContain("\u001b");
  });
});
