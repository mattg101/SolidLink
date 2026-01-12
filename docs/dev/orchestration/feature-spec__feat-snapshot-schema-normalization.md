# Tech Spec: Snapshot Schema and Normalization

## 1. Title Page
| Item | Value |
| --- | --- |
| Feature | Snapshot schema definition and normalization rules |
| Branch | feat-snapshot-schema-normalization |
| Status | Draft |
| Owner | TBD |
| Target Release | TBD |

## 2. Purpose and Scope (Objective)
| Item | Details |
| --- | --- |
| Purpose | Define a canonical snapshot schema and implement normalization for deterministic diffs. |
| In Scope | Schema document, normalization helper, unit tests for normalization. |
| Out of Scope | Creating initial golden snapshots, bridge recording, CLI harness. |
| Success Metrics | Normalized outputs are stable across runs and orderings. |

## 3. Background and Context (System Boundaries)
| Area | Notes |
| --- | --- |
| Fixtures | `SolidLink.Tests/Fixtures/*snapshot*.json` |
| Tests | NUnit unit tests for deterministic diffs |
| Consumers | CLI harness and regression tests |

## 4. Assumptions and Constraints
| Assumption / Constraint | Impact |
| --- | --- |
| Snapshots are JSON | Normalization targets JSON payloads only. |
| Float rounding required | Implement consistent rounding rules. |
| Canonical ordering required | Sort arrays and object keys where defined. |

## 5. Functional Requirements
| ID | Requirement | Priority | Acceptance Criteria |
| --- | --- | --- | --- |
| FR-1 | Create `SolidLink.Tests/Fixtures/snapshot-schema.md` documenting fields and ordering. | P0 | Schema doc lists ordering and rounding rules explicitly. |
| FR-2 | Implement `normalize-snapshot.cs` with canonical ordering and float rounding. | P0 | Same input data yields identical normalized output across runs. |
| FR-3 | Provide unit tests validating normalization behavior. | P0 | Tests pass for ordering and rounding scenarios. |
| FR-4 | Normalizer reports schema violations with actionable messages. | P1 | Invalid fields raise clear exceptions or error results. |

## 6. Non-Functional Requirements (Security & Stability)
| Category | Requirement | Acceptance Criteria |
| --- | --- | --- |
| Determinism | No locale-dependent formatting. | Uses invariant culture for numeric formatting. |
| Stability | Normalization is idempotent. | Applying normalization twice produces identical output. |
| Performance | Normalization handles large assemblies. | Processes >10k nodes under 2 seconds. |

## 7. Architecture Overview (Logical Flow)
| Step | Description |
| --- | --- |
| 1 | Load snapshot JSON into typed DTO or DOM. |
| 2 | Apply canonical ordering rules. |
| 3 | Round floats to defined precision. |
| 4 | Serialize to normalized JSON with stable formatting. |

## 8. Data Models (Data Models / Schema)
| Entity | Notes |
| --- | --- |
| SnapshotSchema | Documented in `snapshot-schema.md`; defines root, nodes, transforms. |
| NormalizedSnapshot | Output JSON matching schema and ordering rules. |

## 9. APIs / Interfaces
| Interface | Usage |
| --- | --- |
| `SnapshotNormalizer.Normalize(string json)` | Returns normalized JSON string. |
| `SnapshotNormalizer.Validate(Snapshot data)` | Reports schema violations. |

## 10. Error Handling
| Scenario | Handling |
| --- | --- |
| Invalid JSON | Return parse error with filename and location. |
| Missing required fields | Fail validation with field path and reason. |
| Unsupported numeric value | Reject NaN/Infinity with explicit error. |

## 11. Testing Strategy
| Test Type | Scope | Pass Criteria |
| --- | --- | --- |
| Unit | Ordering rules | Known unordered input yields ordered output. |
| Unit | Float rounding | Inputs round to defined precision. |
| Unit | Validation | Missing fields produce expected errors. |

## 12. Open Questions
| Question | Owner | Needed By |
| --- | --- | --- |
| What precision should transforms and inertias use? | TBD | Before implementation |
| Should arrays be sorted by name or by stable ID? | TBD | Before implementation |

## 13. Definition of Done (Architect)
- [ ] Interface defined
- [ ] Edge cases mapped
- [ ] Technical risks identified
- [ ] Schema doc and normalizer implemented with tests
