# Agent Skill Specification

The goal is to generate JSON that adheres to the **Agent Skill** specification (v1).
Reference: [https://agentskills.io/specification](https://agentskills.io/specification)

## Key Components to Generate
1. **name**: Unique identifier for the skill.
2. **description**: Clear explanation of what the skill does.
3. **version**: Semantic versioning.

## Implementation Strategy
- **Parser**: Extract structure from CLI `--help` output or `man` pages.
- **Mapping**: Map flags/arguments to tool parameters.
- **Output**: Validated JSON file.
