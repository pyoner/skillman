import { $ } from "bun";
import { parseHelp, stripAnsi } from "./parser";
import { type Program } from "./schema";

export interface CrawledSkill {
  main: {
    program: Program;
    raw: string;
  };
  references: Array<{
    name: string;
    program: Program;
    raw: string;
  }>;
}

async function getHelpText(command: string[]): Promise<string> {
  try {
    const { stdout } = await $`${command} --help`.quiet();
    return stdout.toString();
  } catch (e) {
    // Some commands might output help to stderr or exit with non-zero
    // We try to capture that if possible, otherwise return empty
    return "";
  }
}

export async function crawlCommand(commandName: string): Promise<CrawledSkill> {
  // 1. Get main help
  const mainRaw = await getHelpText([commandName]);
  if (!mainRaw.trim()) {
    throw new Error(`Could not fetch help for command: ${commandName}`);
  }

  const mainProgram = parseHelp(mainRaw);
  // Ensure the program name matches the requested command if parser failed to extract it
  if (mainProgram.name === "unknown") {
    mainProgram.name = commandName;
  }

  const references: CrawledSkill["references"] = [];

  // 2. Fetch help for each subcommand
  for (const cmd of mainProgram.commands) {
    const subCmdRaw = await getHelpText([commandName, cmd.name]);
    if (subCmdRaw.trim()) {
      const subProgram = parseHelp(subCmdRaw);

      // Ignore invalid help output
      if (
        subProgram.name === "unknown" &&
        subProgram.options.length === 0 &&
        subProgram.commands.length === 0 &&
        !stripAnsi(subCmdRaw).match(/Usage:/i)
      ) {
        continue;
      }

      // Ensure subcommand name is set correctly
      subProgram.name = cmd.name;

      references.push({
        name: cmd.name,
        program: subProgram,
        raw: subCmdRaw,
      });
    }
  }

  return {
    main: {
      program: mainProgram,
      raw: mainRaw,
    },
    references,
  };
}
