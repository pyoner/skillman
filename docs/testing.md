# Testing Guide

Bun has a built-in fast test runner. Use `bun:test` for all testing needs.

## Commands
- **Run all tests**: `bun test`
- **Run a single test file**: `bun test src/path/to/file.test.ts`
- **Run tests with a specific name**: `bun test -t "search pattern"`
- **Watch mode**: `bun test --watch`

## Pattern Example
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
