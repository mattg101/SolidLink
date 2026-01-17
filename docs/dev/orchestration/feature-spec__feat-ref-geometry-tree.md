# Tech Spec: Reference Geometry Tree + Axis/CSys Extraction

## 1. Title Page
| Item | Value |
| --- | --- |
| Feature | Reference geometry tree with axes and coordinate systems |
| Branch | feat-ref-geometry-tree |
| Status | Draft |
| Owner | TBD |
| Target Release | TBD |

## 2. Purpose and Scope
| Item | Details |
| --- | --- |
| Purpose | Expose SolidWorks reference geometry (axes + coordinate systems) in a dedicated UI tree to support link frame and joint axis workflows. |
| In Scope | Extract axes + coordinate systems, render in a separate tree section, show/hide origins, integrate with hide system, resizable panel layout. |
| Out of Scope | Assigning frames to links/joints (actions later), importing other reference types (planes/sketch axes), ref-geometry actions beyond hide. |
| Success Metrics | Users can find and toggle reference geometry quickly in large assemblies without cluttering the main component tree. |

## 3. Background and Context
| Area | Notes |
| --- | --- |
| UI | Task pane includes "Assembly Component Tree" at top and "Ref Geometry Tree" below. |
| Data | Reference geometry originates from SolidWorks feature tree. |
| UX | Tree must remain readable at scale; full path shown on hover; "Hide Origins" has a persistent toggle button. |
| Intent | Reference geometry helps define base link frames and joint axes. |
| Related Work | Hidden-state persistence and "Show Hidden" behavior are defined in `feat-hide-components` and should be reused. |

## 4. Assumptions and Constraints
| Assumption / Constraint | Impact |
| --- | --- |
| Entities limited to axes + coordinate systems | Simplifies extraction and display. |
| Names are SolidWorks feature names | No normalization; duplicates may exist. |
| Single root for reference geometry | "Ref Geometry Tree" holds all entries. |
| Full path displayed in condensed form | Must provide tooltip for full path. |
| Hidden state applies to reference geometry | Hide/unhide affects tree + viewport and persists across sessions via shared hidden-state storage. |
| "Hide Origins" applies to tree + viewport | Default ON; user can toggle per item. |
| No inheritance for hide-origins | Parent toggles do not affect children. |
| Ref geometry list is not persisted | Only hide state persists; ref geometry list reloaded from SolidWorks. |

## 5. Functional Requirements
| ID | Requirement | Priority | Acceptance Criteria |
| --- | --- | --- | --- |
| FR-1 | Extract axes + coordinate systems from SolidWorks. | P0 | Reference geometry list includes all axes and CSYS features with stable IDs. |
| FR-2 | Render "Assembly Component Tree" and "Ref Geometry Tree" sections. | P0 | Left panel shows two labeled sections with independent scroll. |
| FR-3 | Provide adjustable divider between sections. | P0 | User can drag a horizontal splitter to resize section heights. |
| FR-4 | Make left panel width adjustable. | P0 | User can drag vertical splitter to resize panel width. |
| FR-5 | Display condensed full path with tooltip. | P0 | Each node shows a condensed path; hover reveals full path. |
| FR-6 | Hide/unhide applies to ref geometry. | P0 | Hiding a ref node removes it from tree + viewport; unhide restores. |
| FR-7 | "Hide Origins" toggle per item. | P0 | Right-click on a ref node toggles origins visibility for that node only. |
| FR-8 | Default "Hide Origins" ON. | P0 | Newly loaded ref nodes default to hidden origins. |
| FR-9 | Show frames and axes in 3D. | P1 | Axes/CSYS render in viewport; hide toggles visibility. |
| FR-10 | Persistent "Hide Origins" toggle button. | P1 | Ref Geometry Tree header includes a toggle that shows/hides origins across ref nodes without opening a menu. |

## 6. Non-Functional Requirements
| Category | Requirement |
| --- | --- |
| Performance | Extract + render 5k ref nodes within 1s. |
| UX | Tree stays readable at scale with tooltips and condensed paths. |
| Accessibility | Resizers and context menus are keyboard reachable. |

## 7. Architecture Overview
| Component | Responsibility |
| --- | --- |
| SolidWorks Extractor | Enumerate axis + coordinate system features with parent path. |
| Ref Geometry Store | Hold ref nodes, visibility, hide-origins flags. |
| Tree UI | Render two trees with independent scroll and resizers. |
| Viewport | Render axes/CSYS glyphs and apply hide/origin flags. |

## 8. Data Models
| Entity | Shape | Notes |
| --- | --- | --- |
| RefGeometryNode | `{ id: string, type: "axis"|"csys", name: string, path: string, parentPath: string }` | `path` stores full component path. |
| RefGeometryVisibility | `{ hiddenIds: string[] }` | Shared with global hide state. |
| RefOriginVisibility | `{ id: string, showOrigin: boolean }` | Per-node toggle; no inheritance. |
| RefOriginGlobalToggle | `{ enabled: boolean }` | UI-level toggle for showing/hiding origins. |

## 9. APIs / Interfaces
| Interface | Usage |
| --- | --- |
| `BridgeMessage{type:"REF_GEOMETRY_LIST"}` | Send axes + CSYS list to UI. |
| `BridgeMessage{type:"REF_GEOMETRY_HIDE"}` | Hide/unhide ref geometry IDs. |
| `BridgeMessage{type:"REF_ORIGIN_TOGGLE"}` | Toggle per-node origin visibility. |
| `BridgeMessage{type:"REF_ORIGIN_GLOBAL_TOGGLE"}` | Toggle origin visibility from the persistent button. |

## 10. Error Handling
| Scenario | Handling |
| --- | --- |
| Duplicate names | Disambiguate by path + ID; show name as-is. |
| Missing parent path | Render under root with warning log. |
| Unsupported feature type | Ignore and log once per session. |

## 11. Testing Strategy
| Test Type | Scope | Pass Criteria |
| --- | --- | --- |
| Unit | Path condensation | Short path rendering + tooltip display. |
| UI | Resizable layout | Splitter resizes sections and panel width. |
| Integration | Extraction | Axes + CSYS appear with correct hierarchy. |
| E2E | Hide/origin toggles | Tree + viewport visibility respond correctly. |

## 12. Open Questions
| Question | Owner | Needed By |
| --- | --- | --- |
| Should origin visibility toggle appear in the context menu only or also inline? | TBD | Before implementation |
