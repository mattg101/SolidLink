# UI Headless Testing Protocol

This doc captures the current headless UI testing workflow and artifact layout. It targets the Playwright setup in `SolidLink.UI` and does not require SolidWorks.

## Goals
- Validate tree/viewport behavior in CI and local runs without SolidWorks.
- Produce deterministic artifacts (screenshots, videos, traces) for review.
- Keep a stable snapshot baseline for UI regressions.

## How It Works
- The UI runs under Playwright using mocked WebView2 bridge behavior.
- Tests inject `TREE_RESPONSE` payloads from JSON fixtures.
- Tests capture both:
  - Playwright snapshots (stored in the repo).
  - Runtime artifacts (stored under `SolidLink.UI/test-results`).

## Run Commands
```powershell
cd SolidLink.UI
npm run test:e2e
```

To update snapshots:
```powershell
cd SolidLink.UI
npm run test:e2e -- --update-snapshots
```

## Fixtures
- `SolidLink.UI/src/test/fixtures/assembly_simple.json`
- `SolidLink.UI/src/test/fixtures/assembly_with_mesh.json`

## Artifact Layout
Artifacts are emitted into:
- `SolidLink.UI/test-results/`

Each test run stores:
- `<test-name>.webm` (copied from Playwright's video output)
- `trace.zip`
- failure screenshots and logs (when applicable)
- explicit screenshots captured by tests (e.g. `tree-filter-arm.png`)

## PR Attachments
Attach the latest artifacts for UI changes to the pull request:
- Relevant `.webm` clips
- Updated snapshots (if changed)
- Any failure screenshots or traces for review

## Snapshot Layout
Snapshot baselines live next to the test file:
- `SolidLink.UI/e2e/viewport.spec.ts-snapshots/*.png`

Snapshots are created via `expect(locator).toHaveScreenshot(...)`.

## UI Elements Under Test
- Tree panel: `[data-testid="tree-root"]`
- Viewport panel: `[data-testid="viewport-panel"]`

## Current Coverage
- Tree filtering hides non-matching nodes.
- Tree filter emits `TREE_FILTER` messages.
- Viewport hides mesh geometry when filtered.
- Selection and hover behavior.

## Notes
- Playwright uses `outputDir: test-results` with videos/traces enabled.
- Videos are duplicated to `run.webm` for consistent review naming.
