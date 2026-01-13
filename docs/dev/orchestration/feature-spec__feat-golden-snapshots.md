# Tech Spec: Golden Snapshot Baselines

## 1. Title Page
| Item | Value |
| --- | --- |
| Feature | Baseline golden snapshots for core assemblies |
| Branch | feat-golden-snapshots |
| Status | Implemented |
| Owner | SolidLink Team |
| Target Release | TBD |

## 2. Purpose and Scope (Objective)
| Item | Details |
| --- | --- |
| Purpose | Add canonical snapshot fixtures for regression diffs. |
| In Scope | Two or more baseline snapshot fixtures, tests to compare outputs. |
| Out of Scope | Snapshot schema design, normalization logic, CLI harness. |
| Success Metrics | Snapshot tests fail on diffs and pass on identical runs. |

## 3. Background and Context (System Boundaries)
| Area | Notes |
| --- | --- |
| Fixtures | `SolidLink.Tests/Fixtures/*snapshot*.json` |
| Tests | NUnit regression tests using snapshot diffing |
| Inputs | Existing assembly fixtures (simple, nested) |

## 4. Assumptions and Constraints
| Assumption / Constraint | Impact |
| --- | --- |
| Snapshot schema is defined | Fixtures must conform to schema. |
| Normalization is available | Use normalization before comparisons. |
| No SolidWorks runtime | Fixtures must be generated from mock data. |

## 5. Functional Requirements
| ID | Requirement | Priority | Acceptance Criteria |
| --- | --- | --- | --- |
| FR-1 | Add at least two snapshot fixtures derived from existing assemblies. | P0 | `*snapshot*.json` files exist and conform to schema. |
| FR-2 | Add tests that compare generated snapshots against baselines. | P0 | Tests fail when output deviates from baseline. |
| FR-3 | Document fixture provenance and expected behavior. | P1 | Each snapshot file has a short README section or header comment. |

## 6. Non-Functional Requirements (Security & Stability)
| Category | Requirement | Acceptance Criteria |
| --- | --- | --- |
| Determinism | Tests use normalized snapshots. | Repeated runs produce identical diffs. |
| Stability | Snapshot comparisons produce stable ordering. | Diffs only when data changes. |
| Maintenance | Fixtures are minimal but representative. | Each snapshot has clear source fixture. |

## 7. Architecture Overview (Logical Flow)
| Step | Description |
| --- | --- |
| 1 | Load mock fixture assembly. |
| 2 | Generate snapshot from traverser/extractor. |
| 3 | Normalize snapshot output. |
| 4 | Compare against golden baseline. |

## 8. Data Models (Data Models / Schema)
| Entity | Notes |
| --- | --- |
| Snapshot | Canonical JSON output per schema. |
| SnapshotBaseline | Stored fixture used for regression diffs. |

## 9. APIs / Interfaces
| Interface | Usage |
| --- | --- |
| `SnapshotComparer.Compare(actual, expected)` | Returns diff summary. |
| `SnapshotNormalizer.Normalize(json)` | Enforces canonical format before compare. |

## 10. Error Handling
| Scenario | Handling |
| --- | --- |
| Missing baseline file | Fail test with clear file path. |
| Schema mismatch | Fail test with field path and reason. |
| Diff detected | Fail test and output diff summary. |

## 11. Testing Strategy
| Test Type | Scope | Pass Criteria |
| --- | --- | --- |
| Unit | Snapshot compare | Known diffs are detected and reported. |
| Regression | Fixture baselines | No diffs for unchanged fixtures. |

## 12. Open Questions
| Question | Owner | Needed By |
| --- | --- | --- |
| How many fixtures are required for coverage? | TBD | Before implementation |
| Where should snapshot README/provenance live? | TBD | Before implementation |

## 13. Definition of Done (Architect)
- [x] Interface defined
- [x] Edge cases mapped
- [x] Technical risks identified
- [x] Baseline snapshots added with passing regression tests
