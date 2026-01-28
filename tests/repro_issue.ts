#!/usr/bin/env bun
const args = process.argv.slice(2);

// Check if it's a subcommand call (e.g., "bad --help")
const isSubcommand = args.length > 0 && !args[0]!.startsWith("-");

if (args.includes("--help") || args.includes("-h")) {
  if (isSubcommand) {
    const sub = args[0];
    if (sub === "bad") {
      // Problematic behavior: valid exit code, but no "Usage:", just execution output
      console.log("Executing bad command... Done.");
      console.log("No skills tracked.");
      process.exit(0);
    }
    if (sub === "good") {
      console.log("Usage: mock-cli good [options]");
      console.log("This is a good subcommand.");
      process.exit(0);
    }
  }

  // Main Help
  console.log("Usage: mock-cli <command> [options]");
  console.log("");
  console.log("Description:");
  console.log("  A mock CLI for testing skillman.");
  console.log("");
  console.log("Commands:");
  console.log("  bad   A command that returns no help");
  console.log("  good  A command that returns help");
  process.exit(0);
}

console.error("Unknown command");
process.exit(1);
