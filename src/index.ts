import { parseHelp } from "./lib/parser";
import { generateSkill } from "./lib/generator";
import { crawlCommand } from "./lib/crawler";
import { saveSkill } from "./lib/writer";

async function main() {
  let input = "";
  let isCommandMode = false;
  const args = process.argv.slice(2);

  // Priority 1: Arguments provided
  if (args.length > 0) {
    const arg = args[0]!;
    
    // Check if the argument is an existing file
    const file = Bun.file(arg);
    if (await file.exists()) {
      input = await file.text();
    } else {
      // If not a file, assume it's a command name to crawl
      isCommandMode = true;
      input = arg;
    }
  } 
  // Priority 2: Stdin provided (and no args)
  else if (!process.stdin.isTTY) {
    input = await Bun.stdin.text();
  }
  // Priority 3: Usage error
  else {
    console.error("Usage: skillman <command-name|file-path> or echo \"help text\" | skillman");
    process.exit(1);
  }

  if (!input.trim()) {
    console.error("No input provided");
    process.exit(1);
  }

  if (isCommandMode) {
    try {
      console.error(`Crawling command: ${input}...`);
      const crawled = await crawlCommand(input);
      
      const outDir = await saveSkill(crawled);
      console.log(`Skill generated at: ${outDir}`);
      
    } catch (e) {
      console.error(`Error crawling command '${input}':`, e instanceof Error ? e.message : String(e));
      process.exit(1);
    }
  } else {
    // File/Stdin Parsing Mode (Output JSON)
    const parsed = parseHelp(input);
    const skill = generateSkill(parsed);
    console.log(JSON.stringify(skill, null, 2));
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
