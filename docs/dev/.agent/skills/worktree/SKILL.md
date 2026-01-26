---
name: worktree
description: Git worktree playbook for this repo. Prefer `git wt` (git-wt) for list/create/switch/delete and configuration.
trigger: always_on
---

This skill follows `engineering-doctrine` and `structured-workflow`.

## Default commands

### List
```sh
git wt
```

### Create or switch
```sh
git wt <branch-or-worktree>
git wt --nocd <branch-or-worktree>   # if you must stay in the current directory
```

### Delete
```sh
git wt -d <branch-or-worktree>       # safe
git wt -D <branch-or-worktree>       # force (only when requested)
```

## Configuration
Use `git config` for defaults; override with flags when needed.

- `wt.basedir` / `--basedir`: base directory for worktrees (default: `../{gitroot}-wt`)
- `wt.copyignored` / `--copyignored`: copy ignored files on create (e.g., `.env`)
- `wt.copyuntracked` / `--copyuntracked`: copy untracked files on create
- `wt.copymodified` / `--copymodified`: copy modified tracked files on create
- `wt.nocopy` / `--nocopy`: exclude patterns from copying (gitignore syntax)
- `wt.copy` / `--copy`: always copy patterns even if ignored
- `wt.hook` / `--hook`: run commands after creating a new worktree
- `wt.nocd` / `--nocd`: prevent automatic directory switching

## Shell integration (PowerShell)
```powershell
Invoke-Expression (git wt --init powershell | Out-String)
```

## Guardrails
- Check status in the target worktree before deleting: `git -C <path> status -u`.
- If you need parallel work, create a new worktree; don’t stack multiple features on one branch.
