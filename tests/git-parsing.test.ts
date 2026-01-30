import { expect, test, describe } from "bun:test";
import { parseHelp, compileProgram } from "../src/lib/parser";

const gitHelpText = `usage: git [-v | --version] [-h | --help] [-C <path>] [-c <name>=<value>]
           [--exec-path[=<path>]] [--html-path] [--man-path] [--info-path]
           [-p | --paginate | -P | --no-pager] [--no-replace-objects] [--bare]
           [--git-dir=<path>] [--work-tree=<path>] [--namespace=<name>]
           [--config-env=<name>=<envvar>] <command> [<args>]

These are common Git commands used in various situations:

start a working area (see also: git help tutorial)
   clone     Clone a repository into a new directory
   init      Create an empty Git repository or reinitialize an existing one

work on the current change (see also: git help everyday)
   add       Add file contents to the index
   mv        Move or rename a file, a directory, or a symlink
   restore   Restore working tree files
   rm        Remove files from the working tree and from the index

examine the history and state (see also: git help revisions)
   bisect    Use binary search to find the commit that introduced a bug
   diff      Show changes between commits, commit and working tree, etc
   grep      Print lines matching a pattern
   log       Show commit logs
   show      Show various types of objects
   status    Show the working tree status

grow, mark and tweak your common history
   branch    List, create, or delete branches
   commit    Record changes to the repository
   merge     Join two or more development histories together
   rebase    Reapply commits on top of another base tip
   reset     Reset current HEAD to the specified state
   switch    Switch branches
   tag       Create, list, delete or verify a tag object signed with GPG

collaborate (see also: git help workflows)
   fetch     Download objects and refs from another repository
   pull      Fetch from and integrate with another repository or a local branch
   push      Update remote refs along with associated objects

'git help -a' and 'git help -g' list available subcommands and some
concept guides. See 'git help <command>' or 'git help <concept>'
to read about a specific subcommand or concept.
See 'git help git' for an overview of the system.
`;

describe("Parser - git -h", () => {
  const blocks = parseHelp(gitHelpText);
  const parsed = compileProgram(blocks);

  test("should identify program name", () => {
    expect(parsed.name).toBe("git");
  });

  test("should parse commands", () => {
    expect(parsed.commands.length).toBeGreaterThan(10);

    const clone = parsed.commands.find((c) => c.name === "clone");
    expect(clone).toBeDefined();
    expect(clone?.description).toBe("Clone a repository into a new directory");

    const commit = parsed.commands.find((c) => c.name === "commit");
    expect(commit).toBeDefined();
    expect(commit?.description).toBe("Record changes to the repository");
  });

  test("should ignore category headers", () => {
    // "start" is the first word of "start a working area..."
    // It should NOT be parsed as a command
    const start = parsed.commands.find((c) => c.name === "start");
    expect(start).toBeUndefined();

    const work = parsed.commands.find((c) => c.name === "work");
    expect(work).toBeUndefined();
  });

  test("should not parse options (git -h has no option block)", () => {
    expect(parsed.options).toHaveLength(0);
  });
});
