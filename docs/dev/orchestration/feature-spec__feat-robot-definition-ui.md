# Tech Spec: Robot Definition UI (Tree + Metadata Panels)

## 1. Title Page
| Item | Value |
| --- | --- |
| Feature | Robot definition UI with graph tree, bottom panel, and metadata editor |
| Branch | feat-robot-definition-ui |
| Status | Draft |
| Owner | TBD |
| Target Release | TBD |

## 2. Purpose and Scope
| Item | Details |
| --- | --- |
| Purpose | Provide a dedicated robot definition UI to build a link/joint tree with beautiful, Figma-like visuals and fast editing. |
| In Scope | Bottom robot tree panel, resizable layout, node/link selection, add/remove children, metadata editor, zoom/pan, undo/redo/save. |
| Out of Scope | Final URDF export formats and advanced joint constraints. |
| Success Metrics | Users can define robot trees, edit metadata, and associate geometry efficiently. |

## 3. Background and Context
| Area | Notes |
| --- | --- |
| UI Layout | Left panel remains full-height; bottom panel under the 3D viewport compresses the viewport only. |
| Data | Add-in owns robot definition JSON, supports save/undo/redo. |
| UX | Tree must feel Figma-like: clean, elegant, responsive interactions. |
| Intent | Build link/joint definitions from geometry, sensors, and reference frames. |

## 4. Assumptions and Constraints
| Assumption / Constraint | Impact |
| --- | --- |
| Nodes can be Body, Sensor, or Frame | UI must show distinct icons/colors. |
| Links (edges) are joints | Joint type displayed: fixed, revolute, linear. |
| Multi-select required | Bulk metadata updates must be supported. |
| Drag select with Shift | Shift toggles drag-selection between nodes and links. |
| Ctrl-click multi-select | Standard additive selection across nodes/links. |
| Collapse on double-click | Collapsed nodes show child indicator (faint subtree marker). |
| Persistence required | Robot definition JSON saved by add-in; undo/redo supported. |

## 5. Functional Requirements
| ID | Requirement | Priority | Acceptance Criteria |
| --- | --- | --- | --- |
| FR-1 | Bottom robot tree panel under viewport. | P0 | Bottom panel spans viewport width only; left panel keeps full height. |
| FR-2 | Resizable layout. | P0 | User can resize bottom panel height; viewport compresses. |
| FR-3 | Robot tree renders nodes and joints. | P0 | Nodes (body/sensor/frame) and joint links are visible with type-specific icon/color. |
| FR-4 | Node selection highlights geometry. | P0 | Selecting node highlights associated geometry in viewport/tree. |
| FR-5 | Multi-select with Ctrl-click. | P0 | Multiple nodes/links selected and shown in selection state. |
| FR-6 | Drag selection with Shift toggle. | P0 | Shift toggles drag-selection between nodes and links. |
| FR-7 | Hover add/remove buttons. | P0 | Small buttons appear on node hover to add/remove children. |
| FR-8 | Collapse/expand nodes. | P0 | Double-click collapses/expands children; collapsed nodes show faint subtree marker. |
| FR-9 | Metadata panel on click. | P0 | Clicking a node or link opens bottom-right panel with fields. |
| FR-10 | Metadata editing fields. | P0 | Name, node type or joint type, associated geometry list are editable. |
| FR-11 | Zoom and pan. | P0 | Mousewheel zooms; drag pans within robot panel. |
| FR-12 | Save/undo/redo. | P0 | Buttons persist JSON and support undo/redo actions. |

## 6. Non-Functional Requirements
| Category | Requirement |
| --- | --- |
| Performance | Smooth zoom/pan at 60fps for 1k nodes. |
| UX | Figma-like visual polish, minimal clutter, consistent spacing. |
| Accessibility | Keyboard operations available for selection and undo/redo. |
| Consistency | Robot definition JSON round-trips deterministically. |

## 7. Architecture Overview
| Component | Responsibility |
| --- | --- |
| Robot Definition Store | Holds nodes, joints, selection state, undo stack. |
| UI Layout | Manages viewport/bottom panel split and resizers. |
| Tree Renderer | Draws nodes/edges, handles zoom/pan and selection. |
| Metadata Panel | Edits node/joint properties and associations. |
| Add-in Bridge | Saves/loads robot JSON and issues undo/redo. |

## 8. Data Models
| Entity | Shape | Notes |
| --- | --- | --- |
| RobotNode | `{ id, name, type, children: string[], geometryIds: string[] }` | type: body|sensor|frame |
| RobotJoint | `{ id, parentId, childId, type }` | type: fixed|revolute|linear |
| RobotDefinition | `{ nodes: RobotNode[], joints: RobotJoint[] }` | Stored in add-in JSON |
| SelectionState | `{ nodeIds: string[], jointIds: string[] }` | Supports multi-select |

## 9. APIs / Interfaces
| Interface | Usage |
| --- | --- |
| `BridgeMessage{type:"ROBOT_DEF_SAVE"}` | Save current definition JSON. |
| `BridgeMessage{type:"ROBOT_DEF_LOAD"}` | Load definition JSON on open. |
| `BridgeMessage{type:"ROBOT_DEF_UNDO"}` | Undo last change. |
| `BridgeMessage{type:"ROBOT_DEF_REDO"}` | Redo last change. |
| `BridgeMessage{type:"ROBOT_DEF_UPDATE"}` | Sync edits for persistence. |

## 10. Error Handling
| Scenario | Handling |
| --- | --- |
| Invalid geometry references | Show warning chip; keep node editable. |
| Orphan joint link | Hide link and log error; keep nodes. |
| Undo stack overflow | Trim oldest entries; notify in debug log. |

## 11. Testing Strategy
| Test Type | Scope | Pass Criteria |
| --- | --- | --- |
| Unit | Selection + collapse | Correct selection sets and collapse state. |
| UI | Layout resizing | Bottom panel resizes; viewport compresses. |
| UI | Zoom/pan | Zoom range and pan constraints work. |
| Integration | Save/load | JSON persists and restores with correct nodes/links. |
| Manual | Visual polish | Figma-like styling and iconography verified. |

## 12. Open Questions
| Question | Owner | Needed By |
| --- | --- | --- |
| Confirm icon set + color palette for node/joint types. | TBD | Before implementation |
| Decide drag-select behavior when both nodes and links overlap. | TBD | Before implementation |
