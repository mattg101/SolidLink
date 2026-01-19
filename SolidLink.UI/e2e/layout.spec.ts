import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const fixture = JSON.parse(
  readFileSync(new URL('../src/test/fixtures/showcase_assembly.json', import.meta.url), 'utf-8')
);
const robotDefFixture = JSON.parse(
  readFileSync(new URL('../src/test/fixtures/showcase_robot_def.json', import.meta.url), 'utf-8')
);

test.describe('Layout', () => {
  test.use({ viewport: { width: 800, height: 600 } });

  test('renders correctly at small window size', async ({ page }) => {
    // Setup bridge
    await page.addInitScript(() => {
      const listeners = new Set();
      (window as any).chrome = {
        webview: {
          addEventListener: (_type: string, handler: any) => {
            listeners.add(handler);
          },
          removeEventListener: (_type: string, handler: any) => {
            listeners.delete(handler);
          },
          postMessage: () => {},
        },
      };
      (window as any).__mockBridge__ = {
        send: (type: string, payload: unknown) => {
          const message = { type, payload };
          listeners.forEach((handler: any) => handler({ data: message }));
        },
      };
    });

    await page.goto('/');
    
    // Load data
    await page.evaluate(({ tree, robot }) => {
      const bridge = (window as any).__mockBridge__;
      bridge.send('TREE_RESPONSE', tree);
      bridge.send('ROBOT_DEF_LOAD', robot);
    }, { tree: fixture, robot: robotDefFixture });

    await page.waitForTimeout(500); // Wait for animations

    // Check Robot Definition Panel layout
    const panel = page.locator('.robot-def-panel');
    await expect(panel).toBeVisible();

    // Check Metadata panel visibility
    const meta = page.locator('.robot-def-meta');
    await expect(meta).toBeVisible();
    
    // Check width of metadata panel (should be 220px as per CSS change)
    const metaBox = await meta.boundingBox();
    expect(metaBox?.width).toBe(220);

    // Verify canvas renders
    const stage = page.locator('.robot-def-canvas-stage');
    await expect(stage).toBeVisible();

    // Check for text overflow in header
    const title = page.locator('.robot-def-title');
    await expect(title).toBeVisible();
    
    // Take a screenshot for visual verification
    await expect(page).toHaveScreenshot('layout-min-size.png');
    
    // Select a node to populate metadata and check for overflow there
    const node = page.locator('.robot-node-group').first();
    await node.click();
    await page.waitForTimeout(200);
    
    await expect(page).toHaveScreenshot('layout-min-size-selected.png');
  });
});
