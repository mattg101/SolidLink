# Tech Spec: Selection and Hover Synchronization

## 1. Title Page
| Item | Value |
| --- | --- |
| Feature | Multi-select and hover highlight between tree and viewport |
| Branch | feat-selection-sync |
| Status | Draft |
| Owner | TBD |
| Target Release | TBD |

## 2. Purpose and Scope (Objective)
| Item | Details |
| --- | --- |
| Purpose | Provide consistent selection and hover behavior across tree and 3D viewport. |
| In Scope | Ctrl/Shift multi-select, hover highlight, drag-select in viewport, selection sync. |
| Out of Scope | Advanced selection sets, SolidWorks native selection manager integration. |
| Success Metrics | Selection + hover are mirrored between tree and viewport. |

## 3. Background and Context (System Boundaries)
| Area | Notes |
| --- | --- |
| UI | Tree list in task pane, viewport meshes. |
| Bridge | Selection messages between add-in and UI. |
| Selection | Existing `SelectionContext` as shared state. |

## 4. Assumptions and Constraints
| Assumption / Constraint | Impact |
| --- | --- |
| Tree nodes map to mesh IDs | Needed for selection synchronization. |
| Drag selection uses screen-space box | Requires camera projection utilities. |
| Hover highlight is transient | Must not overwrite active selection. |

## 5. Functional Requirements
| ID | Requirement | Priority | Acceptance Criteria |
| --- | --- | --- | --- |
| FR-1 | Hovering a tree item highlights the associated geometry. | P0 | Mesh highlights on tree hover and resets on leave. |
| FR-2 | Hovering geometry highlights the corresponding tree item. | P1 | Tree item shows hover state when mesh is hovered. |
| FR-3 | Click selects a single item; Ctrl toggles; Shift selects range in tree. | P0 | Multi-select works with expected keyboard behavior. |
| FR-4 | Drag-select in viewport adds all intersecting meshes to selection. | P0 | Selection set includes all meshes within the drag box. |
| FR-5 | Selection syncs across tree and viewport. | P0 | Selecting in one view updates the other within 100ms. |

## 6. Non-Functional Requirements (Security & Stability)
| Category | Requirement | Acceptance Criteria |
| --- | --- | --- |
| Performance | Hover feedback is immediate. | Highlight updates within 50ms. |
| Stability | Avoid selection flicker when hovering. | Hover does not clear selection. |

## 7. Architecture Overview (Logical Flow)
| Step | Description |
| --- | --- |
| 1 | Input event (hover/click/drag) updates SelectionContext. |
| 2 | SelectionContext emits bridge event with selected IDs. |
| 3 | Tree and viewport subscribe and update visual states. |
| 4 | Hover is tracked separately from selection for transient highlights. |

## 8. Data Models (Data Models / Schema)
| Entity | Notes |
| --- | --- |
| SelectionState | { selectedIds: string[], hoverId?: string } |
| DragSelection | { start: vec2, end: vec2 } |

## 9. APIs / Interfaces
| Interface | Usage |
| --- | --- |
| `BridgeMessage{type:"selection"}` | Sync selection/hover across add-in and UI. |
| `SelectionContext.setSelection(...)` | Update selected IDs. |
| `SelectionContext.setHover(...)` | Update hover target. |

## 10. Error Handling
| Scenario | Handling |
| --- | --- |
| Selection ID not found | Ignore and log once per session. |
| Drag select with no hits | Clear or keep selection based on modifiers. |

## 11. Testing Strategy
| Test Type | Scope | Pass Criteria |
| --- | --- | --- |
| Unit | Selection reducer | Ctrl/Shift logic produces expected sets. |
| UI | Hover + selection styles | Correct tree and mesh highlight states. |
| Manual | SolidWorks task pane | Hover/selection sync works with real geometry. |

## 12. Open Questions
| Question | Owner | Needed By |
| --- | --- | --- |
| Should drag-select replace or add with no modifiers? | TBD | Before implementation |
| Should hover highlight be outline or material tint? | TBD | Before implementation |

## 13. Definition of Done (Architect)
- [ ] Interface defined
- [ ] Edge cases mapped
- [ ] Technical risks identified
- [ ] Multi-select, hover, and drag-select work with sync and tests
