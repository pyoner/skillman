# Bun Usage Guide

This project relies on Bun-native APIs. Do not use Node.js equivalents unless absolutely necessary.

## Native API Usage
- **File I/O**: Use `Bun.file(path)` and `await file.text()` or `Bun.write(path, content)`.
- **Shell Commands**: Use `Bun.$` (e.g., `await $`ls -la\``).
- **Process Spawning**: Use `Bun.spawn`.
- **Environment Variables**: Bun automatically loads `.env` files. Access via `process.env`.

## Error Handling Pattern
Operations that might fail (File I/O, CLI execution) must use this explicit `try/catch` block:

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

## Tooling
- Use `bunx` to run one-off tools without installing them globally.
