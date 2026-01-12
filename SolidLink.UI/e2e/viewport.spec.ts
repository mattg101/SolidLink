import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const fixture = JSON.parse(
  readFileSync(new URL('../src/test/fixtures/assembly_simple.json', import.meta.url), 'utf-8')
);

test('renders assembly tree correctly', async ({ page }) => {
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
        postMessage: (_message: any) => {
        },
      },
    };

    (window as any).__mockBridge__ = {
      send: (type: string, payload: unknown) => {
        const message = {
          type,
          correlationId: `mock-${Date.now()}`,
          payload,
        };
        listeners.forEach((handler: any) => handler({ data: message }));
      },
    };
  });

  await page.goto('/');

  await page.evaluate((data) => {
    (window as any).__mockBridge__.send('TREE_RESPONSE', data);
  }, fixture);

  const treeRoot = page.locator('[data-testid="tree-root"]');
  await expect(treeRoot).toContainText('Base-1');
});
