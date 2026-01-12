# Tech Spec: Headless CLI Harness

## 1. Title Page
| Item | Value |
| --- | --- |
| Feature | Headless CLI harness for extraction and snapshot diff |
| Branch | feat-headless-cli-harness |
| Status | Draft |
| Owner | TBD |
| Target Release | TBD |

## 2. Purpose and Scope (Objective)
| Item | Details |
| --- | --- |
| Purpose | Provide a single CLI entrypoint for headless extraction and diff reporting. |
| In Scope | CLI project, report output, snapshot diff integration. |
| Out of Scope | UI workflows, SolidWorks runtime integration. |
| Success Metrics | CLI runs headlessly and outputs report + diff summary. |

## 3. Background and Context (System Boundaries)
| Area | Notes |
| --- | --- |
| Backend | Uses mock fixtures and abstraction layer. |
| Outputs | `reports/headless-run.json`, `reports/diff-summary.txt` |
| Consumers | CI and agent regression loops. |

## 4. Assumptions and Constraints
| Assumption / Constraint | Impact |
| --- | --- |
| Uses .NET Framework 4.8 | CLI must target net48. |
| No SolidWorks dependency | Must run with mocks and fixtures only. |
| Deterministic output | Normalization required for snapshot output. |

## 5. Functional Requirements
| ID | Requirement | Priority | Acceptance Criteria |
| --- | --- | --- | --- |
| FR-1 | Add a CLI entrypoint that runs mock extraction. | P0 | `SolidLink.Headless` (or equivalent) executes successfully. |
| FR-2 | Generate a JSON report of extracted data. | P0 | Report written to `reports/headless-run.json`. |
| FR-3 | Compare output to golden snapshots and write a diff summary. | P0 | Diff summary written to `reports/diff-summary.txt`. |
| FR-4 | Return non-zero exit code on diffs. | P0 | CLI exits with non-zero status when diffs exist. |

## 6. Non-Functional Requirements (Security & Stability)
| Category | Requirement | Acceptance Criteria |
| --- | --- | --- |
| Determinism | Output is stable across runs. | Identical inputs produce identical reports. |
| Stability | CLI handles missing fixtures gracefully. | Clear error messages without crashes. |
| Performance | Full run completes under 60 seconds. | Headless run duration stays below 60 seconds. |

## 7. Architecture Overview (Logical Flow)
| Step | Description |
| --- | --- |
| 1 | Load fixture input (mock assembly). |
| 2 | Run extraction pipeline (tree + geometry). |
| 3 | Normalize output and write report. |
| 4 | Diff against golden snapshots and write summary. |

## 8. Data Models (Data Models / Schema)
| Entity | Notes |
| --- | --- |
| HeadlessReport | JSON report capturing extracted data. |
| DiffSummary | Text summary of snapshot differences. |

## 9. APIs / Interfaces
| Interface | Usage |
| --- | --- |
| `HeadlessRunner.Run(options)` | Executes the pipeline. |
| `SnapshotComparer.Compare(actual, expected)` | Produces diff summary. |

## 10. Error Handling
| Scenario | Handling |
| --- | --- |
| Fixture not found | Exit non-zero with file path in message. |
| Snapshot diff detected | Exit non-zero and write diff summary. |
| Serialization failure | Exit non-zero with exception details. |

## 11. Testing Strategy
| Test Type | Scope | Pass Criteria |
| --- | --- | --- |
| Unit | CLI option parsing | Valid options parsed correctly. |
| Integration | Headless run | Produces report and diff summary. |
| Regression | Snapshot diff | Non-zero exit on diff. |

## 12. Open Questions
| Question | Owner | Needed By |
| --- | --- | --- |
| Should CLI accept multiple fixtures in one run? | TBD | Before implementation |
| Where should reports be versioned or ignored? | TBD | Before implementation |

## 13. Definition of Done (Architect)
- [ ] Interface defined
- [ ] Edge cases mapped
- [ ] Technical risks identified
- [ ] CLI harness implemented with report + diff output
