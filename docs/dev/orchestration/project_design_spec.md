# Project Design Spec: SolidLink Plugin

## 1. System Architecture

The SolidLink Plugin follows a **Hybrid Bridge Architecture** between a C# SolidWorks Add-in and a browser-based Frontend.

- **Backend (C# .NET 4.8):** Hosts the SolidWorks COM connection, performs geometry extraction (Parasolid tessellation), and manages the lifecycle of the WebView2 windows.
- **Frontend (React/Three.js):** Provides a high-performance 3D rendering environment and the configuration GUI.
- **Communication:** Bi-directional JSON bridge via `WebView2.CoreWebView2.PostWebMessageAsJson` and `window.chrome.webview.addEventListener`.
- **Abstraction Layer:** Interfaces (`ISolidWorksContext`, `IModelDocument`, `IComponent`, etc.) live in `SolidLink.Addin/Abstractions/` and are exercised by headless test fixtures.

## 2. Core Data Models

- **RobotDescription:** The primary in-memory model (JavaScript object) that mirrors the URDF structure.
- **JointAssociation:** Maps SolidWorks Reference Geometry (Coordinate Systems) to URDF Joint origins.
- **LinkAssociation:** Maps filtered SolidWorks Components/Bodies to URDF Link geometry (Visual/Collision).
- **SensorModel:** Encapsulates ROS-standard sensor parameters (Camera, Ray, IMU).

## 3. Key Workflows

- **Stage 1: Tree Configuration (Build):**
    1. Import SolidWorks Assembly hierarchy.
    2. Filter tree (e.g. by component name or visibility) to hide hardware/non-robot parts.
    3. Batch-associate remaining components to Links.
- **Stage 2: Joint Parameterization:**
    1. Select Joint origins (Coordinate Systems).
    2. Define Joint types and limits with 3D arcs/gizmo overlays.
- **Stage 3: Link & Physicals Refinement:**
    1. Preview generated Inertia Tensors as 3D ellipsoids.
    2. Toggle between Visual and Collision meshes (red transparent overlays).
- **Stage 4: Functional Verification:**
    1. Enter "Live Mode" to manipulate joint sliders.
    2. Verify kinematic chain behavior in the high-performance browser renderer.

## 4. Design Patterns

- **MVVM:** Frontend state management for the Robot Description model.
- **Service-Oriented (Backend):** `TreeTraverser`, `GeometryExtractor`, and `MessageBridge` are discrete internal services.
- **Observer:** React components re-render based on updates from the C# bridge.
- **Dependency Injection:** Services accept interface abstractions for testability.

## 5. Agent-First Development Automation

> [!IMPORTANT]
> See [solidlink-agent-dev-spec.md](../solidlink-agent-dev-spec.md) for full details.

### Agent-First Principles
- **Determinism First:** JSON bridge messages, transforms, and URDF outputs must be stable and diffable.
- **Replayability:** Capture bridge traffic so agents can replay sessions without SolidWorks.
- **Headless Verification:** Validate geometry metadata and hierarchy shape without UI inspection.

### Roadmap Milestones (Agent-First)
- **Headless CLI Harness:** Single entrypoint that runs mock extraction and produces a JSON report plus snapshot diff.
- **Snapshot Schema:** Canonical ordering and float rounding rules for stable diffs.
- **Golden Baselines:** At least two fixture assemblies with committed snapshots.
- **Bridge Replay:** Record mode produces replay files; replay mode yields identical snapshots.

### Testing Pipeline (No SolidWorks Required)

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Abstractions** | C# Interfaces | Decouple from COM |
| **Mocks** | JSON Fixtures + Mock Classes | Test data injection |
| **Unit Tests** | NUnit 3.14.0 + Moq | Headless verification |
| **Golden Snapshots** | JSON / text fixtures | Diff-based regression checks |
| **Bridge Replays** | JSON recordings | Deterministic agent runs |
| **Frontend Tests** | Vitest + Playwright | E2E without backend |

### Agent Test Command

```powershell
cd SolidLink
.\packages\NUnit.ConsoleRunner.3.16.3\tools\nunit3-console.exe .\SolidLink.Tests\bin\x64\Debug\SolidLink.Tests.dll --where "cat==Unit"
```

### Key Files

| File | Purpose |
|------|---------|
| `SolidLink.Tests/Fixtures/*.json` | Mock assembly data |
| `SolidLink.Tests/Fixtures/*snapshot*.json` | Golden regression snapshots |
| `SolidLink.Tests/Fixtures/*recording*.json` | Bridge replays |
| `SolidLink.Tests/Mocks/*.cs` | Mock implementations |
| `SolidLink.Tests/Unit/*.cs` | Unit tests (no SW) |
| `SolidLink.Tests/Integration/*.cs` | Integration tests (`[Category("RequiresSW")]`) |

## 6. UI Visual & Behavior Specification

The User Interface is designed for high-density information display with a "Premium" aesthetic (dark mode, glassmorphism) and robust layout flexibility.

### 6.1 Layout System
- **Adjustable Panels:** All major workspace areas are resizable via drag handles with enforced minimum dimensions to prevent layout collapse.
  - **Sidebar:** Width adjustable (220px - 800px).
  - **Tree Split:** Vertical split between CAD Tree and Ref Geometry Tree (min 160px each).
  - **Main Split:** Vertical split between 3D Viewport and Robot Definition (min 100px each).
- **Responsive Handling:** Flexbox-based layout ensures components reflow gracefully on small screens (tested down to 800x600).

### 6.2 Visual Style
- **Typography:** Uses modern sans-serif fonts (e.g., 'Outfit', 'Space Mono') with consistent capitalization (Sentence case, no All-Caps).
- **Theme:** Deep dark mode (`#0d1523`) with radial gradients and semi-transparent overlays (glassmorphism).
- **Interactive Elements:**
  - **Buttons:** Pill-shaped, compact, with hover states.
  - **Overlays:** Metadata panels float over content with `backdrop-filter: blur()`.
  - **Accents:** Use of specific colors for context (Primary Green `#2bc67f`, Selection Blue `#3A86FF`, Sensor Pink `#FF006E`).

### 6.3 Functional Components

#### A. CAD Tree
- **Navigation:** Expand/collapse hierarchy, click to select.
- **Filtering:** Real-time text filter that hides non-matching nodes.
- **Visibility:**
  - **Hide/Show:** Toggle visibility with `Shift+H` or context menu.
  - **Show Hidden:** Global toggle to visualize hidden items as ghosted.
  - **Context Menu:** "Unhide Item", "Toggle Origin".
- **Origin Linking:** Toggling an origin on a CAD component dynamically adds a synthetic "Origin of [Name]" node to the Reference Geometry tree.

#### B. Reference Geometry Tree
- **Listing:** Displays standard reference geometry (Planes, Axes) plus synthetic linked origins.
- **Interaction:** Click to highlight in viewport, right-click to hide/show or toggle visual aids.
- **Global Control:** "Hide Origins" checkbox to toggle all triad visualizations in the viewport.

#### C. 3D Viewport
- **Rendering:** Three.js based renderer handling mesh geometry from SolidWorks.
- **Interaction:**
  - **Orbit/Pan/Zoom:** Standard mouse controls.
  - **Selection:** Bi-directional sync; clicking a mesh selects it in the tree and vice-versa.
  - **Hover:** Pixel-perfect hover highlighting using readback buffer.

#### D. Robot Definition Panel
- **Graph Editor:** visual node-link diagram of the robot structure.
  - **Nodes:** Represent Links/Bodies/Sensors. Draggable, selectable.
  - **Joints:** Bézier curves representing connections. Click to select.
- **Editing:**
  - **Add Child:** Hover node to see `+` action.
  - **Remove:** Hover node to see `x` action.
  - **Clear:** Header button to reset definition to default base.
  - **Undo/Redo:** Full history stack for structural and property changes.
- **Metadata Overlay:**
  - **Floating Panel:** Appears only on selection, floating top-right.
  - **Properties:** Edit Name, Type (Body/Sensor/Frame), Origin Frame.
  - **Geometry Assignment:** "Add to Active Node" via context menu from CAD tree selection.
- **Space Optimization:** Header consolidated (Fit button in canvas), compact headers to maximize graph area.

### 6.4 Automation & Showcase
- **E2E Video:** `npm run test:showcase` generates a comprehensive `showcase.webm` artifact demonstrating all features.
- **Test Label:** Dev-only overlay (`window.__setTestLabel__`) displays the current test step in the recorded video.
