# Code Style and Conventions

## 1. Language & Environment
- **TypeScript**: Always use TypeScript. Avoid `any` at all costs.
- **Runtime**: Target **Bun**. Use Bun-native APIs whenever possible.

## 2. Imports & Modules
- **ES Modules**: Use `import/export` syntax.
- **Bun APIs**: Prefer `import { ... } from "bun"` or the global `Bun` object.
- **Node Compatibility**: Only use `node:*` built-ins if a Bun-native equivalent doesn't exist.
- **File Extensions**: When importing local files, omit the `.ts` extension unless specifically required.

## 3. Naming Conventions
- **Files**: `kebab-case.ts` (e.g., `cli-parser.ts`, `skill-generator.ts`).
- **Variables/Functions**: `camelCase`.
- **Classes/Interfaces/Types**: `PascalCase`.
- **Constants**: `UPPER_SNAKE_CASE`.
- **Enums**: `PascalCase` for the enum name and member names.

## 4. Documentation
- **Public API**: Write JSDoc comments for public-facing functions and classes.
