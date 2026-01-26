---
name: feature-spec-orchestrator
description: Generate implementation-ready feature specs and ensure matching feature branches exist, aligned to project orchestration docs.
trigger: always_on
---

This skill follows `engineering-doctrine` and `structured-workflow`.

## When to use
- User asks for new feature specs under a project docs folder (e.g., `docs/dev/orchestration/`).
- Workflow requires “specs first” on `main`, then feature branches created from updated `main`.

## Inputs (typical)
- Project docs such as `project_context.md`, `project_design_spec.md`, `project_manifesto.md`
- Spec template (e.g., `template_tech_spec.md`)
- Project conventions for branch naming and PR workflow

## Required outputs
- One spec file per feature (implementation-ready, testable requirements)
- Filename includes the **exact** feature branch name, verbatim
- Specs are traceable back to the project docs (link/quote section references)

## Workflow

### 1) Decide the feature set
- If the user provides a list, use it.
- If not, infer a small, coherent slice from the roadmap and state the choice.

### 2) Pick branch names (deterministic)
Use a stable scheme like:
- `feat/<short-kebab>` for features
- `fix/<short-kebab>` for bugs
Keep names short and descriptive.

### 3) Write specs
Create files like:
- `feature-spec__feat/<short-kebab>.md` (or the repo’s preferred naming)

Each spec must include:
- Purpose / non-goals
- User workflows
- Requirements (functional + non-functional) that are testable
- Interfaces / data model touchpoints
- Error handling + telemetry/logging expectations (if relevant)
- Testing strategy + acceptance checklist

### 4) Commit specs to main
```sh
git checkout main
git pull origin main
git add docs/dev/orchestration
git commit -m "Add feature specs for <project>"
git push origin main
```

### 5) Create matching branches from updated main
```sh
git fetch origin
git checkout main
git pull origin main

git checkout -b "feat/<short-kebab>"
git push -u origin HEAD
```

Repeat for each branch name used in the spec filenames.

## Guardrails
- Don’t change existing specs unless asked.
- Don’t create branches until specs are pushed to `main`.
- Don’t add unrelated files to the specs commit.
