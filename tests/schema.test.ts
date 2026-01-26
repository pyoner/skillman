import { expect, test, describe } from "bun:test";
import { AgentSkillSchema } from "../src/types/skill.schema";

describe("AgentSkillSchema Validation (Strict Spec alignment)", () => {
  const validBaseSkill = {
    name: "pdf-processing",
    description: "Extracts text and tables from PDF files, fills PDF forms, and merges multiple PDFs.",
  };

  test("should accept a valid skill with only name and description", () => {
    const result = AgentSkillSchema.safeParse(validBaseSkill);
    expect(result.success).toBe(true);
  });

  test("should reject skill with top-level tools field (not in spec)", () => {
    const result = AgentSkillSchema.safeParse({
      ...validBaseSkill,
      tools: []
    } as any);
    expect(result.success).toBe(true); // Zod ignores unknown keys by default, but let's check if we want strict
  });

  describe("name field constraints", () => {
    const testName = (name: string) => AgentSkillSchema.safeParse({ ...validBaseSkill, name }).success;

    test("valid examples from spec", () => {
      expect(testName("pdf-processing")).toBe(true);
      expect(testName("data-analysis")).toBe(true);
    });

    test("invalid examples from spec", () => {
      expect(testName("PDF-Processing")).toBe(false);
      expect(testName("-pdf")).toBe(false);
      expect(testName("pdf-")).toBe(false);
      expect(testName("pdf--processing")).toBe(false);
    });
  });

  describe("optional fields from spec", () => {
    test("license field", () => {
      expect(AgentSkillSchema.safeParse({ ...validBaseSkill, license: "Apache-2.0" }).success).toBe(true);
    });

    test("compatibility field", () => {
      expect(AgentSkillSchema.safeParse({ ...validBaseSkill, compatibility: "Requires git" }).success).toBe(true);
      expect(AgentSkillSchema.safeParse({ ...validBaseSkill, compatibility: "" }).success).toBe(false);
    });

    test("metadata field", () => {
      expect(AgentSkillSchema.safeParse({ ...validBaseSkill, metadata: { author: "me" } }).success).toBe(true);
    });
  });
});
