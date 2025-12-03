# AGENTS.md

Context file for AI coding assistants (Claude, Cursor, OpenSecretary, etc.) working on this codebase.

## Project Overview

OpenSecretary is an Obsidian plugin that provides an autonomous AI agent for interacting with your vault. Users can chat with the agent to read, write, search, and organize notes. The plugin uses OpenRouter for LLM access and supports multiple models.

This file lives in the plugin's source repository, not in a user's vault.

## Repository Structure

```
open-secretary/
  src/
    main.ts                 # Plugin entry point, settings tab, tool registration
    agent/
      Agent.ts              # Core agent: chat loop, tool dispatch, mode management
      SubAgent.ts           # Base class for specialized sub-agents
    services/
      LLMService.ts         # OpenRouter API wrapper
      RoutineManager.ts     # Saved routine/workflow persistence
    subagents/
      ExploreAgent.ts       # Vault exploration sub-agent
      ResearchAgent.ts      # Web research sub-agent (Perplexity)
      WriterAgent.ts        # Content writing sub-agent
    tools/
      Tool.ts               # Base Tool interface
      FileTools.ts          # File ops: read, write, edit, delete, move, list, create, append
      SearchTool.ts         # Vault search functionality
      PlanTool.ts           # Plan management for plan mode
      SubAgentTool.ts       # Tool for invoking sub-agents
    ui/
      ChatView.tsx          # React-based chat interface (single file)
  styles.css                # All UI styling
  main.js                   # Compiled output (do not edit directly)
  manifest.json             # Obsidian plugin manifest
  package.json              # Dependencies and scripts
```

## Code Standards

### Absolute Rules (Non-Negotiable)

1. **No emojis** - Never use emojis anywhere: code, comments, UI strings, documentation, commit messages
2. **No `any` types** - Use proper TypeScript interfaces and types always
3. **No slop** - Code must be clean and intentional:
   - No comments explaining obvious code
   - No redundant defensive checks for impossible conditions
   - No dead code or commented-out code
   - No internal monologue in comments
   - No excessive whitespace or formatting inconsistencies

### Required Patterns

**Copyright headers** - All source files must include:

```typescript
/**
 * Copyright (c) 2025 McIntosh Media LLC <shane@mto.sh>
 *
 * This file is part of OpenSecretary.
 * Licensed under AGPLv3 - see LICENSE file for details.
 */
```

**TypeScript conventions:**
- Prefer `const` over `let`
- Use optional chaining (`?.`) and nullish coalescing (`??`)
- Use early returns to reduce nesting
- Keep functions focused and small
- React effects must have proper cleanup functions when needed

## Key Concepts

### Agent Modes

The agent operates in three modes:

| Mode | Behavior |
|------|----------|
| `high` | Full autonomy - executes tools without asking |
| `low` | Requires user approval (y/n hotkey) for each tool call |
| `plan` | Creates a plan first, then executes steps with approval |

### Tool System

Tools are how the agent interacts with the vault. Each tool:
- Extends the `Tool` base class
- Has a `name`, `description`, and `parameters` (JSON Schema)
- Implements `execute(args)` to perform the action

Current tools: ReadFile, WriteFile, EditFile, DeleteFile, MoveFile, ListDir, CreateDir, AppendFile, SearchFiles, UpdatePlan, InvokeSubAgent

### Sub-Agents

Specialized agents for specific task types. Each has its own system prompt and can use a subset of tools:

- **ExploreAgent** - Navigates and maps vault structure
- **ResearchAgent** - Web research via Perplexity models
- **WriterAgent** - Long-form content generation

Invoked via `/subagent <name> <task>` in the chat or programmatically.

### UI Architecture

The entire chat UI is in `ChatView.tsx` using React. Key components:
- Message list with markdown rendering (via Obsidian's MarkdownRenderer)
- Input area with auto-resize textarea
- Plan card (collapsible)
- Approval dialog for low autonomy mode
- Model and mode selectors

Styling is in `styles.css` using CSS variables for theming (light/dark).

## Development Workflow

### Building

```bash
npm install          # Install dependencies (first time only)
npm run dev          # Development build with file watching
npm run build        # Production build (includes TypeScript type checking)
```

Output goes to `main.js` in repo root.

### Testing

1. Symlink or copy the repo to `.obsidian/plugins/open-secretary/` in a test vault
2. Enable the plugin in Obsidian settings
3. Reload plugin after rebuilding: Cmd+P > "Reload app without saving"

### Releasing

1. Update version in `manifest.json` and `package.json`
2. Run `npm run build`
3. Commit and tag: `git tag X.Y.Z`
4. Push with tags: `git push origin main --tags`
5. Create GitHub release with `main.js`, `manifest.json`, `styles.css` attached

## Common Tasks

### Adding a New Tool

1. Create or add to a file in `src/tools/`
2. Extend `Tool` base class:
   ```typescript
   export class MyTool extends Tool {
       name = "my_tool";
       description = "What this tool does";
       parameters = { /* JSON Schema */ };
       
       async execute(args: { /* typed args */ }): Promise<string> {
           // Implementation
       }
   }
   ```
3. Register in `src/main.ts`: `this.agent.registerTool(new MyTool(this.app));`

### Adding a New Sub-Agent

1. Create file in `src/subagents/`
2. Extend `SubAgent` base class with custom system prompt
3. Register in `Agent.ts` constructor: `this.subAgents.set("name", new MyAgent(...))`

### Modifying the Chat UI

- All UI logic: `src/ui/ChatView.tsx`
- All styling: `styles.css`
- Uses Obsidian's APIs for markdown rendering and notices
- React state manages messages, loading, plan visibility, approval dialogs

## Licensing

- Open source: AGPLv3
- Copyright: McIntosh Media LLC
- Commercial licensing available: shane@mto.sh
