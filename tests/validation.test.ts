import { expect, test, describe } from "bun:test";
import { generateSkill } from "../src/lib/generator";
import { type ParsedCLI } from "../src/types/skill";

describe("Skill Validation", () => {
  test("should successfully validate a correctly generated skill", () => {
    const parsed: ParsedCLI = {
      name: "test-tool",
      description: "A test tool description that is long enough.",
      options: [
        {
          name: "verbose",
          long: "verbose",
          description: "Verbose output enabled",
          type: "boolean"
        }
      ],
      commands: []
    };

    const skill = generateSkill(parsed);
    expect(skill.name).toBe("test-tool");
    expect(skill.version).toBe("1.0.0");
    expect(skill.tools[0].name).toBe("test-tool");
  });

  test("should handle normalized names", () => {
    const parsed: ParsedCLI = {
      name: "My Tool!",
      description: "Short.", 
      options: [],
      commands: []
    };
    
    // In actual usage, parseHelp would return these normalized
    const skill = generateSkill({
        ...parsed,
        name: "my-tool",
        description: "Short.     "
    });
    expect(skill.name).toBe("my-tool");
  });

  test("should throw an error if validation fails (e.g. invalid name)", () => {
    const invalidParsed: ParsedCLI = {
      name: "test",
      description: "Too short",
      options: [],
      commands: []
    };

    expect(() => generateSkill({
        ...invalidParsed,
        name: "Invalid Name!!!" 
    })).toThrow();
  });
});
