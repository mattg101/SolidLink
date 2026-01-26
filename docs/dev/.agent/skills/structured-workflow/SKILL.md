---
name: structured-workflow
description: Canonical workflow for clarifying requirements, executing work, and verifying correctness.
trigger: always_on
---

This skill follows `engineering-doctrine`.

## Canonical Workflow

### 1) Clarify
- Objective, scope, and definition of done
- Inputs available (repo paths, tools, constraints)
- Minimum set of **blocking** questions (prefer 0–2)

### 2) Decide
- Pick an approach explicitly
- State assumptions and constraints
- Note tradeoffs (speed vs. safety, complexity vs. flexibility) when relevant

### 3) Execute
- Implement only what is in scope
- Follow project conventions
- Prefer small, reversible steps and keep diffs tight

### 4) Verify
- Check against acceptance criteria
- Run/describe the verification steps (tests, build, manual smoke)
- Ensure no debug artifacts remain

### 5) Sync
- Update local state (pull, rebase/merge policy per repo)
- Prepare artifacts for downstream consumers (PR text, docs, test results)

This workflow is mandatory unless a skill explicitly overrides it.
