import { expect, test, describe } from "bun:test";
import { generateSkill } from "../src/lib/generator";
import { type Program } from "../src/lib/schema";

describe("Skill Generation (Spec Compliant)", () => {
  test("should generate a skill with version in metadata", () => {
    const parsed: Program = {
      name: "test-program",
      description: "A test program description that is long enough.",
      version: "1.2.3",
      options: [],
      commands: [],
    };

    const skill = generateSkill(parsed, "Raw help text body");
    expect(skill.name).toBe("test-program");
    expect(skill.metadata?.version).toBe("1.2.3");
    expect(skill.body).toContain("```bash");
    expect(skill.body).toContain("Raw help text body");
    expect((skill as any).version).toBeUndefined();
    expect((skill as any).tools).toBeUndefined();
  });
});
