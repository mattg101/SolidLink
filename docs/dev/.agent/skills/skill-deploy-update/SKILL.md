---
name: skill-deploy-update
description: Create/update/sync Codex skills for this repo. Keep skills in-repo and link into CODEX_HOME using the sync script.
trigger: always_on
---

This skill follows `engineering-doctrine` and `structured-workflow`.

## When to use
- Add, rename, or restructure a skill folder under `.agent/skills/`
- Update SKILL.md contents or bundled resources (references/assets/scripts)
- Sync repo skills into `CODEX_HOME` so Codex discovers them

## Repo layout
Each skill lives in its own folder:

```text
.agent/skills/<skill-name>/
  SKILL.md
  scripts/        (optional)
  references/     (optional)
  assets/         (optional)
```

Rule: the `name:` in SKILL.md frontmatter **must** match the folder name.

## Sync script
Run the repo sync script to link skills into `CODEX_HOME`:

```powershell
.\scripts\sync_skills.ps1
```

Optional: pass an explicit repo skills path:

```powershell
.\scripts\sync_skills.ps1 -RepoSkillsPath "C:\path\to\repo\.agent\skills"
```

## Update flow
1. Edit the skill in `.agent/skills/<skill-name>/`.
2. Keep instructions imperative and runnable (commands in fenced blocks).
3. Re-run the sync script.
4. If you renamed a skill, remove the old link in `CODEX_HOME` (only if it isn't a symlink).

## Template
Start from `assets/skill-template/SKILL.md` when creating a new skill.
