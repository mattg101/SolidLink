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
- Each worktree is permanently bound to its branch

## Standard Setup

```sh
git checkout main
git pull --ff-only
mkdir -p .worktrees
