import { parseHelp } from "./lib/parser";
import { generateSkill } from "./lib/generator";

async function main() {
  let input = "";

  if (process.stdin.isTTY) {
    const args = process.argv.slice(2);
    if (args.length === 0) {
      console.error("Usage: skillman <help-file> or echo \"help text\" | skillman");
      process.exit(1);
    }
    const filePath = args[0]!;
    input = await Bun.file(filePath).text();
  } else {
    input = await Bun.stdin.text();
  }

  if (!input.trim()) {
    console.error("No input provided");
    process.exit(1);
  }

  const parsed = parseHelp(input);
  const skill = generateSkill(parsed);

  console.log(JSON.stringify(skill, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
