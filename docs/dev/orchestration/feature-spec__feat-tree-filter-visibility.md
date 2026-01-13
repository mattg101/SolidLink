# Tech Spec: Tree Filter Visibility Sync

## 1. Title Page
| Item | Value |
| --- | --- |
| Feature | Filter tree items and hide non-matching geometry |
| Branch | feat-tree-filter-visibility |
| Status | Draft |
| Owner | TBD |
| Target Release | TBD |

## 2. Purpose and Scope (Objective)
| Item | Details |
| --- | --- |
| Purpose | Ensure tree filtering hides items in both the task pane tree and the 3D viewport. |
| In Scope | Filter state propagation, tree hiding, geometry visibility toggles. |
| Out of Scope | SolidWorks native FeatureManager tree filtering. |
| Success Metrics | Filtered items disappear from both tree and render without breaking selection. |

## 3. Background and Context (System Boundaries)
| Area | Notes |
| --- | --- |
| UI | React tree + viewport in task pane. |
| Bridge | JSON messages between add-in and UI. |
| Geometry | Meshes keyed by component/link IDs. |

## 4. Assumptions and Constraints
| Assumption / Constraint | Impact |
| --- | --- |
| Tree nodes have stable IDs | Filter state can map to geometry nodes. |
| Large assemblies | Filtering must avoid heavy recomputation per keystroke. |
| No native SW tree control | Filtering applies to SolidLink task pane UI only. |

## 5. Functional Requirements
| ID | Requirement | Priority | Acceptance Criteria |
| --- | --- | --- | --- |
| FR-1 | Filter hides non-matching nodes in the task pane tree. | P0 | Filtered nodes are not rendered in the tree list. |
| FR-2 | Filter hides non-matching geometry in the viewport. | P0 | Non-matching meshes are not rendered or are set invisible. |
| FR-3 | Filter state persists across selection changes. | P1 | Selection does not reset the filter query. |
| FR-4 | Clearing the filter restores tree + geometry visibility. | P0 | All nodes and meshes are visible when filter is empty. |

## 6. Non-Functional Requirements (Security & Stability)
| Category | Requirement | Acceptance Criteria |
| --- | --- | --- |
| Performance | Filtering is responsive for large trees. | Tree update within 150ms for 5k nodes. |
| Stability | No bridge spam on rapid input. | Debounced updates to backend/viewport. |

## 7. Architecture Overview (Logical Flow)
| Step | Description |
| --- | --- |
| 1 | User types filter query in the tree UI. |
| 2 | Tree list filters nodes locally by name and path. |
| 3 | Filtered ID set is sent to viewport (and backend if needed) via bridge. |
| 4 | Viewport toggles mesh visibility based on filter ID set. |

## 8. Data Models (Data Models / Schema)
| Entity | Notes |
| --- | --- |
| TreeFilterState | { query: string, visibleIds: string[] } |
| VisibilityUpdate | Bridge payload to sync visible IDs with viewport. |

## 9. APIs / Interfaces
| Interface | Usage |
| --- | --- |
| `BridgeMessage{type:"treeFilter"}` | Sends filter state to add-in/viewport. |
| `SelectionContext.setFilter(...)` | Maintains filter state in UI. |

## 10. Error Handling
| Scenario | Handling |
| --- | --- |
| Unknown IDs in filter payload | Ignore and log once per session. |
| Empty tree result | Show empty state message in tree. |

## 11. Testing Strategy
| Test Type | Scope | Pass Criteria |
| --- | --- | --- |
| Unit | Filter matching | Correct visible ID set for sample tree. |
| UI | Tree rendering | Non-matching nodes hidden. |
| Manual | SolidWorks task pane | Filtering hides geometry and tree nodes. |

## 12. Open Questions
| Question | Owner | Needed By |
| --- | --- | --- |
| Should filtering match by name only or include metadata? | TBD | Before implementation |
| Should filtered items be greyed out or hidden? | TBD | Before implementation |

## 13. Definition of Done (Architect)
- [ ] Interface defined
- [ ] Edge cases mapped
- [ ] Technical risks identified
- [ ] Filter hides tree nodes and geometry with passing tests
