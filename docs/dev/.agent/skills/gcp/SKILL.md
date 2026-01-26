---
name: gcp
description: Git commit + push with guardrails: stage intentionally, write a meaningful message, and verify the branch/remote.
trigger: always_on
---

This skill follows `engineering-doctrine` and `structured-workflow`.

## When to use
- User asks to "commit and push", "ship this", "get it on origin", or similar.
- You have completed a coherent unit of work and need to publish it.

## Pre-flight checklist (do this every time)
1. Confirm the **current branch** is correct:
   ```sh
   git branch --show-current
   ```
2. Review what changed:
   ```sh
   git status -u
   git diff
   ```
3. Stage **only** relevant files (avoid logs, build outputs, secrets).

## Standard flow
```sh
git add -p
git commit -m "Concise summary of what/why"
git push -u origin HEAD
```

### If staging must be non-interactive
Use this only when changes are obviously scoped:
```sh
git add .
git commit -m "..."
git push -u origin HEAD
```

## Commit message rules
- Lead with the user-visible change (what).
- Include the reason (why) if it’s not obvious.
- Avoid vague messages like "updates" or "fix".

## Guardrails
- Never commit secrets (`.env`, tokens, credentials). If found, stop and tell the user.
- Don’t push to `main`/`master` unless explicitly requested.
- If tests exist and are quick, run them (or describe the command to run) before pushing.
