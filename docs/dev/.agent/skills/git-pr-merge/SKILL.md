---
name: git-pr-merge
description: Gatekeeper workflow: audit a PR, merge to main using `gh`, and sync local branches/worktrees cleanly.
trigger: always_on
---

This skill follows `engineering-doctrine` and `structured-workflow`.

## When to use
- The PR has approval (or the user asks to merge).
- You need a final quality pass before `main` changes.

## 1) Audit (final pass)
- Inspect the diff:
  ```sh
  gh pr diff <id>
  ```
- Check for:
  - Spec/acceptance criteria compliance
  - Unintended file changes (generated artifacts, vendor files)
  - Debug prints / TODOs / commented-out code
  - Missing tests or broken build steps

If the repo uses audit reports, write one. Otherwise, summarize the audit in the PR comment/body text.

## 2) Merge
Default to a normal merge commit unless the repo policy says squash/rebase:
```sh
gh pr merge <id> --merge --delete-branch
```

## 3) Sync local state
```sh
git checkout main
git pull origin main
```

If you have a long-lived dev branch that should track main:
```sh
git checkout dev
git merge main
git push origin dev
```

## 4) Verify
- Ensure repo is clean and on the expected branch:
  ```sh
  git status -u
  git branch --show-current
  ```

## Guardrails
- Never merge if the audit finds a blocking issue; surface the issue and propose the smallest fix.
- Don’t delete branches that are not feature branches unless explicitly requested.
