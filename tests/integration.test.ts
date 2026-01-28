import { expect, test, describe } from "bun:test";
import { $ } from "bun";
import { AgentSkill } from "../src/lib/schema";

describe("Integration", () => {
  test("should parse bun -h output correctly", async () => {
    // Run bun -h | bun run src/index.ts
    const { stdout, stderr, exitCode } = await $`bun -h | bun run src/index.ts`.quiet();

    if (exitCode !== 0) {
      console.error(stderr.toString());
    }

    expect(exitCode).toBe(0);

    const output = stdout.toString();
    const json = JSON.parse(output);

    // Validate against schema
    const result = AgentSkill.safeParse(json);
    if (!result.success) {
      console.error(result.error);
    }
    expect(result.success).toBe(true);

    // Check specific fields
    expect(json.name).toBe("bun");
    expect(json.description).toContain("Bun is a fast JavaScript runtime");
    expect(json.metadata.version).toBeDefined();
    expect(json.metadata.version).toMatch(/^\d+\.\d+\.\d+/);
  });

  test("should support --out directory", async () => {
    const outDir = "test-integration-out";
    await $`rm -rf ${outDir}`.quiet();

    const { exitCode } =
      await $`echo "Usage: my-tool --help" | bun run src/index.ts --out ${outDir}`.quiet();

    expect(exitCode).toBe(0);

    const skillFile = Bun.file(`${outDir}/my-tool/SKILL.md`);
    expect(await skillFile.exists()).toBe(true);

    const content = await skillFile.text();
    expect(content).toContain("name: my-tool");
    expect(content).toContain("# my-tool");

    await $`rm -rf ${outDir}`.quiet();
  });
});
