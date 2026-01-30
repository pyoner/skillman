import { expect, test, describe } from "bun:test";
import { parseHelp, compileProgram } from "../src/lib/parser";

describe("Pnpm Parser Compatibility", () => {
  test("should parse pnpm style help text", () => {
    const helpText = `
Version 10.10.0 (compiled to binary; bundled Node.js v22.18.0)
Usage: pnpm [command] [flags]
       pnpm [ -h | --help | -v | --version ]

Manage your dependencies:
      add                  Installs a package and any packages that it depends
                           on. By default, any new package is installed as a
                           prod dependency
      import               Generates a pnpm-lock.yaml from an npm
                           package-lock.json (or npm-shrinkwrap.json) file
   i, install              Install all dependencies for a project
  it, install-test         Runs a pnpm install followed immediately by a pnpm
                           test

Review your dependencies:
      audit                Checks for known security issues with the installed
                           packages

Run your scripts:
   t, test                 Runs a package's "test" script, if one was provided

Manage your store:
      store add            Adds new packages to the pnpm store directly. Does
                           not modify any projects or files outside the store

Options:
  -r, --recursive          Run the command for each project in the workspace.
`;
    const blocks = parseHelp(helpText);
    const result = compileProgram(blocks);

    expect(result.name).toBe("pnpm");
    expect(result.version).toBe("10.10.0");

    // Check commands
    const commandNames = result.commands.map((c) => c.name);
    expect(commandNames).toContain("add");
    expect(commandNames).toContain("install");
    expect(commandNames).toContain("install-test");
    expect(commandNames).toContain("audit");
    expect(commandNames).toContain("test");
    expect(commandNames).toContain("store add");

    const addCmd = result.commands.find((c) => c.name === "add");
    expect(addCmd?.description).toContain("Installs a package");
    expect(addCmd?.description).toContain("prod dependency");

    const installCmd = result.commands.find((c) => c.name === "install");
    expect(installCmd?.description).toBe("Install all dependencies for a project");

    // Check options
    const recursive = result.options.find((o) => o.long === "recursive");
    expect(recursive).toBeDefined();
    expect(recursive?.short).toBe("r");
  });
});
