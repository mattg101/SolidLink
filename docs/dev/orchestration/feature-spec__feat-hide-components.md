# Tech Spec: Hide Tree Components and Viewport Geometry

## 1. Title Page
| Item | Value |
| --- | --- |
| Feature | Hide tree components and 3D geometry with restore controls |
| Branch | feat-hide-components |
| Status | Draft |
| Owner | TBD |
| Target Release | TBD |

## 2. Purpose and Scope
| Item | Details |
| --- | --- |
| Purpose | Let users hide components in the tree and viewport to focus link selection without modifying the SolidWorks model. |
| In Scope | Hide/unhide interactions, persistence in the SolidWorks file, tree toggle to show hidden, shortcut help popup. |
| Out of Scope | Editing the SolidWorks FeatureManager tree, permanent model suppression, or geometry deletion. |
| Success Metrics | Users can hide/unhide quickly, recover hidden items reliably, and hidden state persists across sessions. |

## 3. Background and Context
| Area | Notes |
| --- | --- |
| UI | React tree + 3D viewport in task pane WebView2. |
| Backend | C# add-in persists URDF metadata and must also persist hidden state. |
| UX Model | SolidWorks-inspired hide/restore without modifying the source model. |
| Intent | Visibility changes help isolate components for link association only. |

## 4. Assumptions and Constraints
| Assumption / Constraint | Impact |
| --- | --- |
| Tree nodes have stable IDs | Hidden state maps consistently to geometry and tree nodes. |
| Hidden state stored in its own custom properties | Stored under a dedicated feature tree item; restore on load. |
| Multi-select + hierarchy | Hide/unhide applies to selected nodes and all descendants. |
| Hidden items are fully invisible | No ghosting in viewport; hidden items not rendered. |
| Hidden state is UI-only | Link selection logic ignores visibility state. |
| Large assemblies | Hide/unhide operations must be performant and avoid full tree recompute. |

## 5. Functional Requirements
| ID | Requirement | Priority | Acceptance Criteria |
| --- | --- | --- | --- |
| FR-1 | Hide selected items via `Shift+H`. | P0 | With multi-select in tree or viewport, `Shift+H` hides all selected nodes and their descendants. |
| FR-2 | Hide from context menu. | P0 | Right-click on a selected tree node or highlighted geometry shows "Hide"; invoking hides the selection. |
| FR-3 | Hidden items disappear from viewport. | P0 | Hidden nodes and descendants are not rendered or selectable in the 3D view. |
| FR-4 | Hidden state is visible in tree. | P0 | Hidden nodes show a clear indicator (eye-off or dim) and do not appear when "Show Hidden" is off. |
| FR-5 | "Show Hidden" toggle preserves hierarchy. | P0 | Toggling on reveals hidden nodes within the tree structure, not a flat list. |
| FR-6 | "Unhide All" restores visibility. | P0 | A single action restores all hidden items in tree and viewport. |
| FR-7 | Unhide by clicking hidden items. | P0 | In "Show Hidden" mode, clicking an item (or context menu) unhides it and its descendants. |
| FR-8 | Persist hidden state in file. | P0 | Hidden IDs are saved to the SolidWorks file and restored on reopen. |
| FR-9 | Visibility does not affect link selection. | P0 | Hidden state does not alter link association logic or data output. |
| FR-10 | Shortcut help popup. | P1 | A help popup lists `Shift+H`, "Show Hidden", and "Unhide All" actions. |
| FR-11 | Menu bar Help entry. | P1 | Menu bar includes Help -> "Shortcuts" that opens the shortcut popup. |

## 6. Non-Functional Requirements
| Category | Requirement |
| --- | --- |
| Performance | Hide/unhide updates must complete within 250ms for 5k nodes. |
| Consistency | Hidden state round-trips deterministically in saved files. |
| Accessibility | All actions are available via keyboard and mouse. |
| UX | Provide clear recovery paths (toggle + unhide all) to avoid "lost" items. |

## 7. Architecture Overview
| Component | Responsibility |
| --- | --- |
| Tree UI | Tracks hidden IDs, renders indicators, toggles "Show Hidden". |
| Viewport | Applies hidden set to mesh visibility and selection masking. |
| Bridge | Synchronizes hidden state between UI and add-in when needed. |
| Add-in | Persists hidden IDs to a dedicated feature tree item + custom properties and restores on load. |
| Menu Bar | Hosts Help -> Shortcuts entry to open the popup. |

## 8. Data Models
| Entity | Shape | Notes |
| --- | --- | --- |
| HiddenState | `{ hiddenIds: string[] }` | Stored in-memory and persisted in custom properties. |
| HideRequest | `{ ids: string[], includeDescendants: boolean }` | UI to viewport/add-in. |
| ShowHiddenState | `{ enabled: boolean }` | UI-only toggle. |

## 9. APIs / Interfaces
| Interface | Usage |
| --- | --- |
| `BridgeMessage{type:"HIDE_REQUEST"}` | Hide a set of IDs (with descendants). |
| `BridgeMessage{type:"UNHIDE_REQUEST"}` | Unhide a set of IDs (with descendants). |
| `BridgeMessage{type:"HIDDEN_STATE_UPDATE"}` | Sync full hidden ID list for persistence. |
| `BridgeMessage{type:"HIDDEN_STATE_RESTORE"}` | Provide persisted hidden IDs on load. |

## 10. Error Handling
| Scenario | Handling |
| --- | --- |
| Unknown IDs | Ignore and log once per session. |
| Corrupt persisted state | Drop invalid IDs, keep valid ones, emit warning. |
| Empty or missing hidden state | Treat as "no hidden items" with no errors. |

## 11. Testing Strategy
| Test Type | Scope | Pass Criteria |
| --- | --- | --- |
| Unit | Hidden set updates | Correct descendant inclusion and unhide behavior. |
| UI | Tree rendering | Hidden nodes disappear; "Show Hidden" reveals them. |
| E2E | Viewport visibility | Hidden meshes not rendered; unhide restores. |
| Integration | Persistence | Hidden IDs saved and restored across sessions. |

## 12. Open Questions
| Question | Owner | Needed By |
| --- | --- | --- |
| Confirm data schema for the hidden state custom properties. | TBD | Before implementation |
