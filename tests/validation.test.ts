import { expect, test, describe } from "bun:test";
import { generateSkill } from "../src/lib/generator";
import { type ParsedCLI } from "../src/types/skill";

describe("Skill Generation (Spec Compliant)", () => {
  test("should generate a skill with version in metadata", () => {
    const parsed: ParsedCLI = {
      name: "test-tool",
      description: "A test tool description that is long enough.",
      version: "1.2.3",
      options: [],
      commands: []
    };

    const skill = generateSkill(parsed);
    expect(skill.name).toBe("test-tool");
    expect(skill.metadata?.version).toBe("1.2.3");
    expect((skill as any).version).toBeUndefined();
    expect((skill as any).tools).toBeUndefined();
  });
});
