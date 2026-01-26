---
name: git-worktrees
description: Work on multiple branches in parallel using git worktrees. Prefer `git wt` (git-wt) for safer defaults.
trigger: always_on
---

This skill follows `engineering-doctrine` and `structured-workflow`.

## Mental model
- **One branch = one folder = one line of work**
- All worktrees share the same underlying `.git` database
- A worktree is "attached" to a branch while it exists

## Preferred tooling
Default to `git wt` (https://github.com/k1LoW/git-wt). Use raw `git worktree` only if `git wt` is unavailable.

## Standard setup (optional)
Store worktrees in `.worktrees/` inside the repo:
```sh
mkdir -p .worktrees
git config wt.basedir .worktrees
```

## Common operations

### List
```sh
git wt
```

### Create or switch
```sh
git wt <branch-or-worktree>
# stay in current directory:
git wt --nocd <branch-or-worktree>
```

### Delete safely
```sh
git wt -d <branch-or-worktree>
```

### Force delete (only when requested)
```sh
git wt -D <branch-or-worktree>
```

## Cleanup & recovery
- Before deleting anything, check for uncommitted changes in that worktree:
  ```sh
  git -C <path-to-worktree> status -u
  ```
- If a worktree folder was deleted manually:
  ```sh
  git worktree prune
  ```

## PowerShell shell integration
```powershell
Invoke-Expression (git wt --init powershell | Out-String)
```

## Guardrails
- Never delete a worktree/branch that contains uncommitted work without an explicit user decision.
- Avoid mixing unrelated tasks inside one worktree; create a new branch/worktree instead.
