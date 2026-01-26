# Tech Spec: Robot Definition Save System (SolidWorks-Linked)

## 1. Title Page
- **Feature**: Robot Definition Save System (SolidWorks-Linked)
- **Branch**: feat-save-system
- **Owner**: Codex
- **Date**: 2026-01-26
- **Status**: Draft

## 2. Purpose and Scope
Provide a save/load/version system for robot definitions that is linked to the active SolidWorks file. The system must persist definitions both inside the SolidWorks model and alongside it as a JSON sidecar, support explicit version saves with commit messages, and allow loading past versions or external definition files from UI.

In scope:
- Save current definition (no commit message required).
- Save version (commit message required).
- Store definition and version history in SolidWorks attribute and sidecar JSON.
- Load last-associated definition on add-in open.
- Load definitions from another JSON file and associate with current model.
- UI for Save, Save Version, Load, History, and version selection.
- Tree order must match SolidWorks feature tree order.

Out of scope:
- Cloud sync
- Multi-user merging
- Diff tooling
- Automatic versioning on every save

## 3. Background and Context
SolidLink previously stored robot definition state only in the UI. Users require persistent, model-linked storage with local version history similar to SW2URDF, which stores serialized configuration in a SolidWorks Attribute feature. This spec formalizes that system and required UI.

## 4. Assumptions and Constraints
- **Assumption**: SolidWorks allows storing a JSON string in an Attribute parameter (tested in SW2URDF).
- **Assumption**: JSON size fits within SolidWorks attribute string limits for typical robots.
- **Constraint**: Add-in cannot rely on external services.
- **Constraint**: UI must work with existing WebView2 bridge messaging.
- **Constraint**: Headless project must not reference SolidWorks interop.

## 5. Functional Requirements
| ID | Requirement | Priority | Rationale | Verification |
|---:|-------------|----------|-----------|--------------|
| FR-1 | **Save** writes the current robot definition to both SolidWorks Attribute and sidecar JSON next to the SW model. | P0 | Persist user work. | Save button produces updated attribute + sidecar file. |
| FR-2 | **Save Version** requires a non-empty commit message and adds a version entry with timestamp and definition snapshot. | P0 | Auditability. | UI blocks empty message; saved record shows new version. |
| FR-3 | **Load on open** loads the last associated robot definition when the add-in initializes for a model. | P0 | Seamless continuity. | On open, UI shows last saved definition. |
| FR-4 | **Load file** lets users choose another JSON file and associates it with the current model. | P0 | Cross-file reuse. | Load selects file, updates definition, and linked path persists. |
| FR-5 | **History UI** lists version entries and allows loading any previous version. | P0 | Version rollback. | Selecting a version loads the snapshot. |
| FR-6 | **Embedded storage** stores the definition + history inside the SolidWorks model via Attribute feature. | P1 | Portability. | Attribute data contains JSON record. |
| FR-7 | **Tree order** matches SolidWorks feature tree order, including nested folders. | P1 | Visual parity. | Tree order matches SW in test assembly. |

## 6. Non-Functional Requirements
| ID | Requirement | Priority | Rationale | Verification |
|---:|-------------|----------|-----------|--------------|
| NFR-1 | Save/Load operations must complete within 250 ms for typical (<2 MB JSON) definitions. | P1 | UI responsiveness. | Manual timing and log stamps. |
| NFR-2 | Feature must work offline with no external dependencies. | P0 | SolidWorks constraints. | No network calls required. |
| NFR-3 | If sidecar write fails, attribute save still occurs and user gets an error message in logs/UI. | P1 | Reliability. | Simulate write failure and confirm error handling. |

## 7. Architecture Overview
- **UI (SolidLink.UI)** triggers Save/Save Version/Load/History via bridge messages.
- **Add-in (SolidLink.Addin)** receives messages and uses `RobotDefinitionStorage`.
- **RobotDefinitionStorage** handles serialization, SolidWorks Attribute IO, and sidecar JSON IO.
- **TreeTraverser/SolidWorksComponent** provides feature-tree-ordered children.

## 8. Data Models
### RobotDefinitionRecord (stored JSON)
```json
{
  "schema": "solidlink_robot_def_v1",
  "modelPath": "C:/path/model.SLDASM",
  "linkedDefinitionPath": "C:/path/model.solidlink.json",
  "updatedUtc": "2026-01-26T02:30:00Z",
  "definition": { "nodes": [], "joints": [] },
  "history": [
    {
      "id": "<guid>",
      "message": "Initial version",
      "timestampUtc": "2026-01-26T02:30:00Z",
      "definition": { "nodes": [], "joints": [] }
    }
  ]
}
```

### SolidWorks Attribute Parameters
| Param | Type | Purpose |
|------|------|---------|
| data | string | JSON-serialized RobotDefinitionRecord |
| date | string | Last update timestamp |
| version | double | Attribute schema version |
| linkedPath | string | Linked sidecar path |

## 9. APIs / Interfaces
### Bridge Messages (UI → Add-in)
| Type | Payload | Notes |
|------|---------|------|
| ROBOT_DEF_SAVE | `RobotDefinition` | Save current definition. |
| ROBOT_DEF_SAVE_VERSION | `{ definition, message }` | Save version; message required. |
| ROBOT_DEF_LOAD | `void` | Load associated definition. |
| ROBOT_DEF_LOAD_FILE | `void` | Open file picker and load JSON. |
| ROBOT_DEF_LOAD_VERSION | `{ id }` | Load a version by id. |
| ROBOT_DEF_HISTORY_REQUEST | `void` | Request history list. |

### Bridge Messages (Add-in → UI)
| Type | Payload | Notes |
|------|---------|------|
| ROBOT_DEF_LOAD | `RobotDefinition` | Loaded definition to render. |
| ROBOT_DEF_HISTORY | `{ history, linkedPath, modelPath }` | Version list and associations. |

## 10. Error Handling
- If commit message is empty on Save Version, reject request and show UI validation error.
- If sidecar write fails, still persist to attribute and log error.
- If attribute read fails, fall back to sidecar read.
- If loaded JSON is invalid, show error and do not overwrite current definition.

## 11. Testing Strategy
- Unit tests for RobotDefinitionStorage serialization and history behavior (mocked FS).
- Integration test: Save, Save Version, Load, Load Version using test model.
- Manual test: tree order matches SW feature tree with foldered assembly.

## 12. Rollout / Migration Plan
- No migration required for new installs.
- If older records exist, treat as missing history and continue.

## 13. Open Questions
1. Maximum acceptable JSON size for SolidWorks attribute storage?
2. Should Save Version auto-increment a visible version number?
3. Should there be a UI indicator when the linked sidecar file is missing?

## Definition of Done
- [ ] Save/Load/Save Version/History UI implemented and wired.
- [ ] RobotDefinition stored in SW Attribute and sidecar JSON.
- [ ] Commit message required for version saves.
- [ ] Load on open uses last associated definition.
- [ ] Tree order matches SolidWorks feature tree order.
- [ ] Tests updated and passing.
