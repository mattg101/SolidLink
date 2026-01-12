# Tech Spec: Agent CI Pipeline

## 1. Title Page
| Item | Value |
| --- | --- |
| Feature | Agent CI pipeline for SolidLink tests |
| Branch | feat-agent-ci-pipeline |
| Status | Draft |
| Owner | TBD |
| Target Release | TBD |

## 2. Purpose and Scope (Objective)
| Item | Details |
| --- | --- |
| Purpose | Add a GitHub Actions pipeline that runs backend and frontend tests headlessly. |
| In Scope | Workflow definition, build/test steps, job matrix for backend/frontend. |
| Out of Scope | Test refactors, new test cases, release packaging. |
| Success Metrics | Workflow runs on push/PR; backend + frontend tests complete successfully. |

## 3. Background and Context (System Boundaries)
| Area | Notes |
| --- | --- |
| Repo | `.github/workflows/solidlink-tests.yml` new workflow. |
| Backend | `SolidLink.sln`, `SolidLink.Tests` using NUnit + Moq. |
| Frontend | `SolidLink.UI` using npm, Vitest, Playwright. |
| External | GitHub Actions runners, MSBuild, Node 20. |

## 4. Assumptions and Constraints
| Assumption / Constraint | Impact |
| --- | --- |
| Uses .NET Framework 4.8 with `packages.config` | MSBuild + NuGet restore required. |
| Playwright installs browser deps | Requires `npx playwright install --with-deps`. |
| CI must be deterministic | No non-deterministic test outputs or ordering. |

## 5. Functional Requirements
| ID | Requirement | Priority | Acceptance Criteria |
| --- | --- | --- | --- |
| FR-1 | Add workflow triggered on push to `main`/`dev` and PRs to `main`. | P0 | Workflow runs for all specified triggers. |
| FR-2 | Backend job builds `SolidLink.sln` on Windows and runs `dotnet test` with `Category!=RequiresSW`. | P0 | Job passes on a clean checkout with no SolidWorks installed. |
| FR-3 | Frontend job installs dependencies, runs `npm test`, and runs Playwright E2E. | P0 | Job passes on a clean checkout; Playwright installs browsers. |
| FR-4 | Workflow fails when any test step fails. | P0 | Non-zero exit from any test step fails the job. |

## 6. Non-Functional Requirements (Security & Stability)
| Category | Requirement | Acceptance Criteria |
| --- | --- | --- |
| Stability | Avoid flaky tests by using pinned tool versions. | Node and MSBuild versions are specified in workflow. |
| Security | No secrets required for test workflow. | Workflow runs with default GITHUB_TOKEN only. |
| Performance | CI completes in under 15 minutes. | Workflow timing stays below 15 minutes on standard runners. |

## 7. Architecture Overview (Logical Flow)
| Step | Description |
| --- | --- |
| 1 | Checkout repository. |
| 2 | Backend job: setup MSBuild, restore NuGet, build solution, run unit tests. |
| 3 | Frontend job: setup Node, install dependencies, run Vitest and Playwright. |

## 8. Data Models (Data Models / Schema)
| Item | Details |
| --- | --- |
| N/A | Workflow-only change; no new data models. |

## 9. APIs / Interfaces
| Interface | Usage |
| --- | --- |
| GitHub Actions `checkout`, `setup-node`, `setup-msbuild` | Workflow steps for CI. |
| `dotnet test` | Backend unit tests with category filter. |
| `npm test` / `npx playwright test` | Frontend tests. |

## 10. Error Handling
| Scenario | Handling |
| --- | --- |
| NuGet restore failure | Fail job with actionable output in logs. |
| Build failure | Fail job and surface MSBuild errors. |
| Playwright install failure | Fail job; re-run after dependency fix. |

## 11. Testing Strategy
| Test Type | Scope | Pass Criteria |
| --- | --- | --- |
| Workflow smoke | Trigger workflow via branch push | All jobs complete successfully. |
| Backend unit | `dotnet test` | No failing tests; filter excludes RequiresSW. |
| Frontend unit/E2E | `npm test`, Playwright | All tests pass headlessly. |

## 12. Open Questions
| Question | Owner | Needed By |
| --- | --- | --- |
| Should CI publish test artifacts (TRX, screenshots) on failure? | TBD | Before implementation |
| Should backend build target Debug or Release? | TBD | Before implementation |

## 13. Definition of Done (Architect)
- [ ] Interface defined
- [ ] Edge cases mapped
- [ ] Technical risks identified
- [ ] Workflow file created and validated in CI
