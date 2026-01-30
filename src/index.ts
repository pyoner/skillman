import { Command } from "commander";
import { parseHelp, stripAnsi, compileProgram } from "./lib/parser";
import { generateSkill } from "./lib/generator";
import { crawlCommand } from "./lib/crawler";
import { saveSkill } from "./lib/writer";
import packageJson from "../package.json";

const program = new Command();

program
  .name("skillman")
  .description("Convert CLI help text or man pages into Agent Skill format")
  .version(packageJson.version || "0.0.0")
  .argument("[input]", "command name to crawl, file path to parse, or empty for stdin")
  .option("-o, --out <dir>", "output directory for the generated skill", ".")
  .action(async (inputArgument: string | undefined, options: { out: string }) => {
    let input = "";
    let isCommandMode = false;

    // 1. Handle Input (Positional Argument or Stdin)
    if (inputArgument) {
      const file = Bun.file(inputArgument);
      if (await file.exists()) {
        input = await file.text();
      } else {
        isCommandMode = true;
        input = inputArgument;
      }
    } else if (!process.stdin.isTTY) {
      input = await Bun.stdin.text();
    } else {
      program.help();
    }

    if (!input.trim()) {
      console.error("Error: No input provided");
      process.exit(1);
    }

    // 2. Execute Logic
    if (isCommandMode) {
      try {
        console.error(`Crawling command: ${input}...`);
        const crawled = await crawlCommand(input);
        const outDir = await saveSkill(crawled, options.out);
        console.error(`Skill generated at: ${outDir}`);
      } catch (e) {
        console.error(
          `Error crawling command '${input}':`,
          e instanceof Error ? e.message : String(e),
        );
        process.exit(1);
      }
    } else {
      // File/Stdin Parsing Mode
      const cleanInput = stripAnsi(input);
      const blocks = parseHelp(cleanInput);
      const parsed = compileProgram(blocks);

      if (options.out !== ".") {
        // Output to directory as SKILL.md
        const crawled = {
          main: { program: parsed, raw: cleanInput },
          references: [],
        };
        const outDir = await saveSkill(crawled, options.out);
        console.error(`Skill generated at: ${outDir}`);
      } else {
        // Default: Output JSON to stdout
        const skill = generateSkill(parsed, cleanInput);
        console.log(JSON.stringify(skill, null, 2));
      }
    }
  });

program.parse();
