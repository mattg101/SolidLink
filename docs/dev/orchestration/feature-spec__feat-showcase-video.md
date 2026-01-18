# Feature Spec: Showcase Video

## Summary

Create a single end-to-end test video that demonstrates all UI features in sequence, with an on-screen test label overlay that updates throughout the video to indicate which test/feature is currently being demonstrated.

## Goals

1. **Single comprehensive video** - One video artifact that showcases all features
2. **Test label overlay** - A visible text box in the UI that displays the current test name/description
3. **Extensible architecture** - New features can easily add their demonstrations to the showcase
4. **Artifact output** - Produces `showcase.webm` in test-results for easy sharing

## Technical Design

### 1. Test Label Component

Add a `TestLabel` component to the UI that:
- Renders a fixed-position overlay in the top-center of the viewport
- Only visible in test/dev mode (not production)
- Displays current test name with styling that's clearly visible but not obtrusive
- Exposed via `window.__setTestLabel__(text: string)` for Playwright to control

```tsx
// src/components/TestLabel/TestLabel.tsx
const TestLabel = () => {
  const [label, setLabel] = useState<string | null>(null);
  
  useEffect(() => {
    (window as any).__setTestLabel__ = setLabel;
    return () => delete (window as any).__setTestLabel__;
  }, []);
  
  if (!label) return null;
  
  return (
    <div className="test-label-overlay">
      {label}
    </div>
  );
};
```

### 2. Showcase Test File

Create `e2e/showcase.spec.ts` that:
- Runs as a single long test (not parallel)
- Calls individual demo functions in sequence
- Updates the test label before each demo section
- Uses slower, more deliberate actions for visibility

```ts
// e2e/showcase.spec.ts
test('showcase all features', async ({ page }) => {
  await loadPage(page);
  
  await setLabel(page, '🌳 Tree Navigation');
  await demoTreeNavigation(page);
  
  await setLabel(page, '🔍 Tree Filtering');
  await demoTreeFilter(page);
  
  await setLabel(page, '👁️ Hide/Show Components');
  await demoHideShow(page);
  
  await setLabel(page, '🤖 Robot Definition Panel');
  await demoRobotDefinition(page);
  
  await setLabel(page, '↩️ Undo/Redo');
  await demoUndoRedo(page);
  
  // ... more demos
});
```

### 3. Demo Helper Functions

Each demo function:
- Performs a sequence of actions that demonstrate the feature
- Uses `page.waitForTimeout()` between actions for visibility
- Returns the page to a clean state for the next demo

```ts
const DEMO_DELAY = 800; // ms between actions

const demoTreeNavigation = async (page: Page) => {
  const base = page.locator('[data-frame-id="root"]');
  await base.hover();
  await page.waitForTimeout(DEMO_DELAY);
  await base.click();
  await page.waitForTimeout(DEMO_DELAY);
  // expand, select children, etc.
};
```

### 4. Playwright Config for Showcase

Add a dedicated project in `playwright.config.ts`:

```ts
{
  name: 'showcase',
  testMatch: 'showcase.spec.ts',
  use: {
    video: {
      mode: 'on',
      size: { width: 1920, height: 1080 }
    },
    viewport: { width: 1920, height: 1080 },
  },
}
```

### 5. NPM Script

Add to `package.json`:

```json
"scripts": {
  "test:showcase": "playwright test --project=showcase"
}
```

## Extensibility Pattern

When adding new features:

1. Create a demo function in `e2e/showcase-demos/<feature>.ts`
2. Export it from `e2e/showcase-demos/index.ts`
3. Add call in `showcase.spec.ts` with appropriate label

Example:
```ts
// e2e/showcase-demos/ref-geometry.ts
export const demoRefGeometry = async (page: Page) => {
  await setLabel(page, '📐 Reference Geometry');
  // demo actions...
};
```

## Acceptance Criteria

- [ ] `npm run test:showcase` produces `test-results/showcase.webm`
- [ ] Video shows test label overlay updating throughout
- [ ] All major features demonstrated: tree, filter, hide/show, robot def, undo/redo
- [ ] Video is watchable (deliberate pacing, ~2-3 min total)
- [ ] TestLabel component only renders in dev/test mode
- [ ] Adding new demos requires only adding a demo function and one line in showcase.spec.ts

## File Structure

```
SolidLink.UI/
├── src/
│   └── components/
│       └── TestLabel/
│           ├── TestLabel.tsx
│           └── TestLabel.css
├── e2e/
│   ├── showcase.spec.ts
│   └── showcase-demos/
│       ├── index.ts
│       ├── tree-navigation.ts
│       ├── tree-filter.ts
│       ├── hide-show.ts
│       ├── robot-definition.ts
│       └── undo-redo.ts
└── playwright.config.ts (updated)
```
