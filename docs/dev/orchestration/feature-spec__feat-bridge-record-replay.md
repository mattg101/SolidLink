# Tech Spec: Bridge Record and Replay

## 1. Title Page
| Item | Value |
| --- | --- |
| Feature | Record and replay JSON bridge traffic |
| Branch | feat-bridge-record-replay |
| Status | Implemented |
| Owner | SolidLink Team |
| Target Release | TBD |

## 2. Purpose and Scope (Objective)
| Item | Details |
| --- | --- |
| Purpose | Capture bridge traffic and replay deterministically for regression runs. |
| In Scope | Record mode, replay mode, fixture storage, unit tests. |
| Out of Scope | UI changes, SolidWorks integration smoke tests. |
| Success Metrics | Replay produces identical snapshot outputs for a recording. |

## 3. Background and Context (System Boundaries)
| Area | Notes |
| --- | --- |
| Bridge | C# <-> WebView2 JSON messages |
| Fixtures | `SolidLink.Tests/Fixtures/*recording*.json` |
| Tests | Headless replay to validate determinism |

## 4. Assumptions and Constraints
| Assumption / Constraint | Impact |
| --- | --- |
| Messages are JSON-serializable | Capture is text-based. |
| Replay must be deterministic | Ordering and timing must be stable. |
| SolidWorks not required | Replay uses mock data and fixtures. |

## 5. Functional Requirements
| ID | Requirement | Priority | Acceptance Criteria |
| --- | --- | --- | --- |
| FR-1 | Implement record mode that writes ordered message logs. | P0 | Recording file contains ordered messages with timestamps. |
| FR-2 | Implement replay mode that feeds messages to the bridge. | P0 | Replay yields identical snapshot output vs recording. |
| FR-3 | Store recordings under `SolidLink.Tests/Fixtures/`. | P0 | At least one `*recording*.json` exists. |
| FR-4 | Provide unit tests for record/replay determinism. | P1 | Tests pass headlessly without SolidWorks. |

## 6. Non-Functional Requirements (Security & Stability)
| Category | Requirement | Acceptance Criteria |
| --- | --- | --- |
| Determinism | Preserve message ordering and content. | Replay produces byte-identical normalized outputs. |
| Stability | Safe handling of large recordings. | No crashes on recordings > 5 MB. |
| Security | Avoid writing secrets to recordings. | Recording filter excludes tokens or credentials. |

## 7. Architecture Overview (Logical Flow)
| Step | Description |
| --- | --- |
| 1 | Bridge intercepts outbound and inbound JSON messages. |
| 2 | Record mode serializes messages to a recording file. |
| 3 | Replay mode reads the file and emits messages in order. |
| 4 | Snapshot generation consumes replayed messages. |

## 8. Data Models (Data Models / Schema)
| Entity | Notes |
| --- | --- |
| BridgeRecording | Array of message entries with direction, type, payload, timestamp. |
| BridgeMessage | Existing message shape used in bridge. |

## 9. APIs / Interfaces
| Interface | Usage |
| --- | --- |
| `BridgeRecorder.Start(path)` | Begin recording message traffic. |
| `BridgeRecorder.Stop()` | Flush and close file. |
| `BridgeReplayer.Play(path)` | Emit messages to bridge in order. |

## 10. Error Handling
| Scenario | Handling |
| --- | --- |
| Recording path invalid | Fail with descriptive file error. |
| Replay file malformed | Fail fast with validation errors. |
| Missing message type handler | Log and fail test. |

## 11. Testing Strategy
| Test Type | Scope | Pass Criteria |
| --- | --- | --- |
| Unit | Record serialization | File contents match expected entries. |
| Unit | Replay ordering | Messages emitted in original order. |
| Regression | Replay snapshot | Snapshot output matches baseline. |

## 12. Open Questions
| Question | Owner | Needed By |
| --- | --- | --- |
| Should timestamps be preserved or normalized out? | TBD | Before implementation |
| Where should record/replay config live? | TBD | Before implementation |

## 13. Definition of Done (Architect)
- [x] Interface defined
- [x] Edge cases mapped
- [x] Technical risks identified
- [x] Record/replay implemented with passing tests
