import { expect, test, describe } from "bun:test";
import { $ } from "bun";
import { AgentSkillSchema } from "../src/types/skill.schema";

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
    const result = AgentSkillSchema.safeParse(json);
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
});
