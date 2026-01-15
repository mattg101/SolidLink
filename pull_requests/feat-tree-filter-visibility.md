# PR: Tree Filter Visibility Sync (Ref: docs/dev/orchestration/feature-spec__feat-tree-filter-visibility.md)

## 1. Summary of Changes
Add tree filtering that hides non-matching nodes and syncs viewport visibility, plus bridge `TREE_FILTER` messages. Extend Playwright headless coverage with snapshots, per-test videos, and mesh fixture assertions. Document the headless UI testing protocol and update PR checklist to require artifact attachments.

## 2. Run Instructions
1) `cd SolidLink.UI`
2) `npm run test:e2e`
3) (Optional) update snapshots: `npm run test:e2e -- --update-snapshots`

## 3. Local Test Report
- [x] **Build Status**: NOT RUN
- [x] **Unit Tests**: N/A
- [x] **Manual Sanity Check**: Playwright headless tests run (`npm run test:e2e`)
- [x] **Artifacts Attached**: UI headless artifacts from `SolidLink.UI/test-results/` (`.webm`, screenshots, traces as needed)
- [x] **Snapshots Updated**: Snapshot images updated

## 3.1 Artifact Links
- SolidLink.UI/test-results/pr-artifacts/tree-filter-hide.webm
- SolidLink.UI/test-results/pr-artifacts/tree-filter-send.webm
- SolidLink.UI/test-results/pr-artifacts/mesh-filter-hide.webm
- SolidLink.UI/test-results/pr-artifacts/tree-filter-arm.png
- SolidLink.UI/test-results/pr-artifacts/tree-filter-end.png
- SolidLink.UI/test-results/pr-artifacts/mesh-before.png
- SolidLink.UI/test-results/pr-artifacts/mesh-after.png
- SolidLink.UI/test-results/pr-artifacts/tree-filter-hide-trace.zip
- SolidLink.UI/test-results/pr-artifacts/tree-filter-send-trace.zip
- SolidLink.UI/test-results/pr-artifacts/mesh-filter-hide-trace.zip

## 4. Modified Files
- SolidLink.UI/src/App.tsx
- SolidLink.UI/src/components/Viewport/Viewport.tsx
- SolidLink.UI/playwright.config.ts
- SolidLink.UI/e2e/viewport.spec.ts
- SolidLink.UI/e2e/viewport.spec.ts-snapshots/tree-filter-arm-win32.png
- SolidLink.UI/e2e/viewport.spec.ts-snapshots/tree-filter-end-win32.png
- SolidLink.UI/e2e/viewport.spec.ts-snapshots/mesh-before-filter-win32.png
- SolidLink.UI/e2e/viewport.spec.ts-snapshots/mesh-after-filter-win32.png
- docs/dev/orchestration/ui-headless-testing.md
- docs/dev/orchestration/template_pr.md

## 5. Definition of Done (Developer)
- [x] Code follows `orchestration/project_context.md`
- [ ] Clean build (NOT RUN)
- [x] PR created in `pull_requests/`
