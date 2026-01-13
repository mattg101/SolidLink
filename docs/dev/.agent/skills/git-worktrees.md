---
trigger: always_on
---

---
name: git-worktrees
description: Work on multiple branches in parallel using git worktrees without context switching or merge noise.
---

This skill follows `engineering-doctrine`.

## Core Model

- One branch == one directory == one line of work
- All worktrees share a single `.git` database
- Each worktree is bound to its branch while it exists

## Standard Setup

```sh
git checkout main
git pull --ff-only
mkdir -p .worktrees
git worktree add .worktrees/feat-some-branch -b feat-some-branch
```

## Example Workflow
```sh
git worktree add .worktrees/feat-api-tweak -b feat-api-tweak
git worktree list
cd .worktrees/feat-api-tweak
git status
cd ../..
git worktree remove .worktrees/feat-api-tweak
git branch -d feat-api-tweak
```

## Cleanup
always check if there are uncommitted changes in a worktree before
- removing its branch
- deleting the local worktree folder

Use `git worktree remove <path>` for clean removals.
If a worktree folder was deleted manually, run `git worktree prune`.
Ask user what to do with those uncommitted changes.
