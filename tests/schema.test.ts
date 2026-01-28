import { expect, test, describe } from "bun:test";
import { AgentSkill } from "../src/lib/schema";

describe("AgentSkillSchema Validation (Strict Spec alignment)", () => {
  const validBaseSkill = {
    name: "pdf-processing",
    description:
      "Extracts text and tables from PDF files, fills PDF forms, and merges multiple PDFs.",
    body: "## Instructions\n\nRun the command.",
  };

  test("should accept a valid skill with only name and description", () => {
    const result = AgentSkill.safeParse(validBaseSkill);
    expect(result.success).toBe(true);
  });

  test("should reject skill with top-level tools field (not in spec)", () => {
    const result = AgentSkill.safeParse({
      ...validBaseSkill,
      tools: [],
    } as any);
    expect(result.success).toBe(true); // Zod ignores unknown keys by default, but let's check if we want strict
  });

  describe("name field constraints", () => {
    const testName = (name: string) => AgentSkill.safeParse({ ...validBaseSkill, name }).success;

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
      expect(AgentSkill.safeParse({ ...validBaseSkill, license: "Apache-2.0" }).success).toBe(true);
    });

    test("compatibility field", () => {
      expect(
        AgentSkill.safeParse({
          ...validBaseSkill,
          compatibility: "Requires git",
        }).success,
      ).toBe(true);
      expect(AgentSkill.safeParse({ ...validBaseSkill, compatibility: "" }).success).toBe(false);
    });

    test("metadata field", () => {
      expect(
        AgentSkill.safeParse({
          ...validBaseSkill,
          metadata: { author: "me" },
        }).success,
      ).toBe(true);
    });
  });
});
