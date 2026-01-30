# skillman

**skillman** is a CLI tool that converts CLI help text and manual pages into the [Agent Skill](https://agentskills.io/specification) specification format. It automates the creation of structured skill definitions for AI agents.

## 🚀 Installation

This project is built with [Bun](https://bun.sh).

```bash
bun install
```

## 📖 Usage

You can use `skillman` in three ways: by crawling a command directly, reading a file, or piping input.

### 1. Crawl a Command
Automatically run help/man commands for a tool and generate the skill structure.

```bash
# Generate a skill for the 'tar' command in the ./skills/tar directory
bun run src/index.ts tar -o ./skills/tar
```

### 2. Parse a File
Read a text file containing help output.

```bash
bun run src/index.ts help.txt
```

### 3. Pipe Input
Pipe output directly into the tool.

```bash
git --help | bun run src/index.ts
```

### Options
- `-o, --out <dir>`: Output directory for the generated skill (defaults to current directory or stdout for piped input).

## 🛠 Development

For development guidelines, coding conventions, and directory structure, please refer to [AGENTS.md](./AGENTS.md).

### Key Commands
- **Run App**: `bun run src/index.ts`
- **Test**: `bun test`
- **Type Check**: `bun x tsc --noEmit`
