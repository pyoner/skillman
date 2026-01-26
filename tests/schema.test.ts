import { expect, test, describe } from "bun:test";
import { AgentSkillSchema } from "../src/types/skill.schema";

describe("AgentSkillSchema Validation (based on SKILL_SPEC.md)", () => {
  const validBaseSkill = {
    name: "pdf-processing",
    description: "Extracts text and tables from PDF files, fills PDF forms, and merges multiple PDFs. Use when working with PDF documents or when the user mentions PDFs, forms, or document extraction.",
    version: "1.0.0",
    tools: [
      {
        name: "extract-pdf",
        description: "Extract content from PDF",
        parameters: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "path to file"
            }
          }
        }
      }
    ]
  };

  describe("name field constraints", () => {
    const testName = (name: string) => AgentSkillSchema.safeParse({ ...validBaseSkill, name }).success;

    test("valid examples from spec", () => {
      expect(testName("pdf-processing")).toBe(true);
      expect(testName("data-analysis")).toBe(true);
      expect(testName("code-review")).toBe(true);
    });

    test("invalid examples from spec", () => {
      expect(testName("PDF-Processing")).toBe(false); // uppercase not allowed
      expect(testName("-pdf")).toBe(false); // cannot start with hyphen
      expect(testName("pdf-")).toBe(false); // cannot end with hyphen
      expect(testName("pdf--processing")).toBe(false); // consecutive hyphens not allowed
    });

    test("length constraints", () => {
      expect(testName("a".repeat(1))).toBe(true);
      expect(testName("a".repeat(64))).toBe(true);
      expect(testName("a".repeat(65))).toBe(false);
    });
  });

  describe("description field constraints", () => {
    const testDesc = (description: string) => AgentSkillSchema.safeParse({ ...validBaseSkill, description }).success;

    test("good example from spec", () => {
      expect(testDesc("Extracts text and tables from PDF files, fills PDF forms, and merges multiple PDFs. Use when working with PDF documents or when the user mentions PDFs, forms, or document extraction.")).toBe(true);
    });

    test("non-empty constraint", () => {
      expect(testDesc("")).toBe(false);
    });

    test("length constraints", () => {
      expect(testDesc("a".repeat(1024))).toBe(true);
      expect(testDesc("a".repeat(1025))).toBe(false);
    });
  });

  describe("optional fields from spec", () => {
    test("license field", () => {
      const result = AgentSkillSchema.safeParse({
        ...validBaseSkill,
        license: "Proprietary. LICENSE.txt has complete terms"
      });
      expect(result.success).toBe(true);
    });

    test("compatibility field", () => {
      expect(AgentSkillSchema.safeParse({ ...validBaseSkill, compatibility: "Designed for Claude Code (or similar products)" }).success).toBe(true);
      expect(AgentSkillSchema.safeParse({ ...validBaseSkill, compatibility: "" }).success).toBe(false);
      expect(AgentSkillSchema.safeParse({ ...validBaseSkill, compatibility: "a".repeat(500) }).success).toBe(true);
      expect(AgentSkillSchema.safeParse({ ...validBaseSkill, compatibility: "a".repeat(501) }).success).toBe(false);
    });

    test("metadata field", () => {
      const result = AgentSkillSchema.safeParse({
        ...validBaseSkill,
        metadata: {
          author: "example-org",
          version: "1.0"
        }
      });
      expect(result.success).toBe(true);
    });

    test("allowed-tools field", () => {
      const result = AgentSkillSchema.safeParse({
        ...validBaseSkill,
        "allowed-tools": "Bash(git:*) Bash(jq:*) Read"
      });
      expect(result.success).toBe(true);
    });
  });
});

describe("Parser Schemas Validation", () => {
  test("should accept a valid ParsedCLI object", () => {
    const validParsed: any = {
      name: "mytool",
      description: "A tool",
      options: [
        {
          name: "verbose",
          description: "Verbose output",
          type: "boolean"
        }
      ],
      commands: [
        {
          name: "build",
          description: "Build command"
        }
      ]
    };
    const { ParsedCLISchema } = require("../src/types/skill.schema");
    expect(ParsedCLISchema.safeParse(validParsed).success).toBe(true);
  });
});
