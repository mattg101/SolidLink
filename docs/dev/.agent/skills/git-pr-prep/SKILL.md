---
name: git-pr-prep
description: Prepare a high-signal Pull Request: stage intentionally, verify against acceptance criteria, and create the PR via `gh`.
trigger: always_on
---

This skill follows `engineering-doctrine` and `structured-workflow`.

## When to use
- A feature/fix is complete and you want review.
- You need a consistent PR body, checklist, and verification instructions.

## Pre-flight
1. Confirm branch:
   ```sh
   git branch --show-current
   ```
2. Ensure working tree is clean **except** the intended changes:
   ```sh
   git status -u
   ```
3. Run the fastest high-signal verification you have (lint/unit tests/build). Prefer commands already used in the repo.

## Stage intentionally
- Use interactive staging to keep the diff reviewable:
  ```sh
  git add -p
  ```
- Re-check:
  ```sh
  git diff --cached
  ```

## PR content requirements
Include:
- **What changed** (bullet list)
- **Why** (1–2 bullets)
- **How to verify** (exact commands + any manual steps)
- **Screenshots/video** for UI changes (if applicable)
- **Risks/roll-back** if the change is invasive

If the repo has a PR template or explicit acceptance criteria doc, follow it.

## Create the PR (GH CLI)
```sh
gh pr create --base main --head HEAD --title "..." --body "..."
```

### Useful extras
- Open in browser after creation:
  ```sh
  gh pr view --web
  ```

## Guardrails
- Do not include generated binaries, node_modules, or secrets.
- Keep PRs small: if the diff is large, split into stacked PRs or separate commits.
- If tests produced artifacts that belong in-repo, include them only if the project convention expects that.
