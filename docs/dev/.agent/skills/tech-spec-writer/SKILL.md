---
name: tech-spec-writer
description: Write implementation-ready software technical specifications for senior engineers (requirements testable, architecture explicit, risks managed).
trigger: always_on
---

This skill follows `engineering-doctrine` and `structured-workflow`.

## Interview (required, but keep it lightweight)
Before drafting:
- Clarify goal, users, workflows, and non-goals
- Confirm constraints (performance, security, offline, deployment)
- Define acceptance criteria and “done”
- Identify integration points (APIs, data models, repos/services)

If the user is in a hurry: ask 3–5 sharply targeted questions, summarize assumptions, then proceed.

## Output requirements
- Markdown
- Requirements are **testable** (each has a verification method)
- Prefer tables over prose for requirements and interfaces
- Explicit assumptions + open questions
- Include at least one concrete example (payloads, CLI calls, UI flows)

## Required sections (do not omit)
1. Title Page
2. Purpose and Scope
3. Background and Context
4. Assumptions and Constraints
5. Functional Requirements
6. Non-Functional Requirements
7. Architecture Overview
8. Data Models
9. APIs / Interfaces
10. Error Handling
11. Testing Strategy
12. Rollout / Migration Plan (even if “none”)
13. Open Questions

## Requirements table format (recommended)
| ID | Requirement | Priority | Rationale | Verification |
|---:|-------------|----------|-----------|--------------|

## Definition of done (include)
A short checklist that can be used in a PR review to say “yes, ship it.”
