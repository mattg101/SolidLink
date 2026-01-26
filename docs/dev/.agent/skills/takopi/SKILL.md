---
name: takopi
description: Guidance for Takopi (Telegram bridge): directives, branch/worktree routing, ctx footers, topics, and file retrieval.
trigger: always_on
---

This skill follows `engineering-doctrine` and `structured-workflow`.

## When to use
- A request is being issued via Takopi (Telegram).
- You need to format instructions that Takopi will parse (directives, `/file get`, topic context).

## Core behaviors
- Directives live at the start of the first line: `/project`, `/engine`, and `@branch`.
- Replying to a message that includes a backticked `ctx:` footer keeps the same project/branch.
- `@branch` runs in a dedicated git worktree for that branch.

## Quick patterns
```text
/project task text
/project @branch task text
/engine /project @branch task text
```

Examples:
```text
/solidlink @feat/ui-panel polish error states and add tests
/solidlink fix build warnings
```

## Topics (Telegram forums)
- Use `/topic` and `/ctx` to bind a project/branch context inside a thread.
- Use `/new` to reset stored session context when switching tasks.

## File retrieval (`/file get`)
Rules:
- Use **relative paths** from the project root.
- Avoid absolute paths (`C:\...`) and home paths; the harness rejects them.
- Prefer listing files first (`ls`, `find`) then emit `/file get` lines.

Examples:
```text
/file get SolidLink.UI/test-results/robot-definition-renders-robot-definition-panel/test-finished-1.png
/file get SolidLink.UI/test-results/viewport-shift-H-hides-sel-3bc76-es-and-updates-bridge-state/video.webm
/file get docs/dev/orchestration/feature-spec__feat-ui-panel.md
```

## Test artifacts playbook
1. Run tests to generate artifacts.
2. Locate outputs:
   ```sh
   find . -maxdepth 4 -type f \( -name "*.png" -o -name "*.webm" -o -name "*.xml" \)
   ```
3. Emit `/file get <relative-path>` lines in a code block.

## Reference
See `references/takopi-context.md` for the concise rules and directive list.
