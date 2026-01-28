import { expect, test, describe } from "bun:test";
import { crawlCommand } from "../src/lib/crawler";
import { resolve } from "path";

describe("Crawler Fix", () => {
  test("should ignore subcommands that do not return valid help", async () => {
    const mockCliPath = resolve(process.cwd(), "tests/repro_issue.ts");

    console.log(`Crawling mock CLI at: ${mockCliPath}`);

    const result = await crawlCommand(mockCliPath);

    // Check main program
    expect(result.main.program.name).toBe("mock-cli");
    expect(result.main.program.commands.length).toBe(2); // bad and good exist in main help

    // Check references
    // "bad" should be ignored because it doesn't return "Usage:"
    // "good" should be present
    const refNames = result.references.map((r) => r.name);
    console.log("Captured references:", refNames);

    expect(refNames).toContain("good");
    expect(refNames).not.toContain("bad");
  });
});
