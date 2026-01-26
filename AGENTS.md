# Agentic Coding Guidelines - skillman

This repository contains `skillman`, a CLI tool designed to convert CLI help text and manual pages into the **Agent Skill** specification format. This project is built using the **Bun** runtime and **TypeScript**.

---

## 🛠 Build and Development Commands

Agents should use `bun` for all operations. Do not use `npm`, `yarn`, or `pnpm`.

### Core Commands
- **Install Dependencies**: `bun install`
- **Run Application**: `bun run src/index.ts`
- **Run in Watch Mode**: `bun --hot src/index.ts`
- **Type Checking**: `bun x tsc --noEmit`

### Testing with `bun test`
Bun has a built-in fast test runner.
- **Run all tests**: `bun test`
- **Run a single test file**: `bun test src/path/to/file.test.ts`
- **Run tests with a specific name**: `bun test -t "search pattern"`
- **Watch mode for tests**: `bun test --watch`

---

## 📐 Code Style and Conventions

### 1. Language & Environment
- **TypeScript**: Always use TypeScript. Avoid `any` at all costs.
- **Runtime**: Target **Bun**. Use Bun-native APIs whenever possible.
- **Strict Mode**: Strict null checks and other strict flags are enabled in `tsconfig.json`.

### 2. Imports & Modules
- **ES Modules**: Use `import/export` syntax.
- **Bun APIs**: Prefer `import { ... } from "bun"` or the global `Bun` object.
- **Node Compatibility**: Only use `node:*` built-ins if a Bun-native equivalent doesn't exist.
- **File Extensions**: When importing local files, omit the `.ts` extension unless specifically required.

### 3. Naming Conventions
- **Files**: `kebab-case.ts` (e.g., `cli-parser.ts`, `skill-generator.ts`).
- **Variables/Functions**: `camelCase`.
- **Classes/Interfaces/Types**: `PascalCase`.
- **Constants**: `UPPER_SNAKE_CASE`.
- **Enums**: `PascalCase` for the enum name and member names.

### 4. Bun-Native API Usage (Preferred)
- **File I/O**: Use `Bun.file(path)` and `await file.text()` or `Bun.write(path, content)`.
- **Shell Commands**: Use `Bun.$` (e.g., `await $`ls -la\``).
- **Process Spawning**: Use `Bun.spawn`.
- **Environment Variables**: Bun automatically loads `.env` files. Access via `process.env`.

### 5. Error Handling
- Use explicit `try/catch` blocks for operations that might fail (File I/O, CLI execution).
- Throw descriptive errors.
- In `catch(e)` blocks, type-check the error before usage:
  ```typescript
  try {
    // operation
  } catch (err) {
    if (err instanceof Error) {
      console.error(err.message);
    }
    throw err;
  }
  ```

---

## 🤖 Agent Skill Specification

The goal is to generate JSON that adheres to the **Agent Skill** specification (v1).
Reference: [https://agentskills.io/specification](https://agentskills.io/specification)

### Key Components to Generate:
1. **name**: Unique identifier for the skill.
2. **description**: Clear explanation of what the skill does.
3. **version**: Semantic versioning.
4. **tools**: Array of tool definitions (name, description, parameters).

### Implementation Strategy for `skillman`:
- **Parser**: Extract structure from CLI `--help` output or `man` pages.
- **Mapping**: Map flags/arguments to tool parameters.
- **Output**: Validated JSON file.

---

## 🧪 Testing Patterns

Use `bun:test` for all testing needs.

```typescript
import { test, expect, describe } from "bun:test";
import { parseHelp } from "./parser";

describe("Help Parser", () => {
  test("should extract flags correctly", () => {
    const helpOutput = "Usage: cmd --flag-a <val>";
    const result = parseHelp(helpOutput);
    expect(result.flags).toContain("flag-a");
  });
});
```

---

## 📁 Directory Structure

- `src/`: Main source code.
- `src/index.ts`: CLI entry point.
- `src/lib/`: Reusable logic and utilities.
- `src/types/`: Type definitions and interfaces.
- `tests/` or `**/*.test.ts`: Test files.

---

## 📝 General Principles
- **Keep it Simple**: Favor readable code over complex abstractions.
- **Performance**: Leverage Bun's speed.
- **Documentation**: Write JSDoc comments for public-facing functions/classes.
- **Tooling**: Use `bunx` to run one-off tools without installing them globally.

---

## 🔌 Cursor/Copilot Instructions
(No specific `.cursorrules` or `.github/copilot-instructions.md` found. Following project defaults.)
- Follow the patterns established in `src/index.ts`.
- Maintain the minimalist approach of the project.
