import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const fixture = JSON.parse(
  readFileSync(new URL('../src/test/fixtures/assembly_simple.json', import.meta.url), 'utf-8')
);
const meshFixture = JSON.parse(
  readFileSync(new URL('../src/test/fixtures/assembly_with_mesh.json', import.meta.url), 'utf-8')
);

const setupBridge = async (page: any) => {
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
};

const loadTree = async (page: any, data: any) => {
  await setupBridge(page);
  await page.goto('/');
  await page.evaluate((payload) => {
    (window as any).__mockBridge__.send('TREE_RESPONSE', payload);
  }, data);
};

const getCanvasCenter = async (page: any) => {
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas bounding box not available');
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  return { x, y };
};

const readPixel = async (page: any, x: number, y: number) => {
  return page.evaluate(({ px, py }) => {
    const reader = (window as any).__renderReadback__;
    if (typeof reader !== 'function') return null;
    return reader({ x: px, y: py });
  }, { px: x, py: y });
};

const waitForReadback = async (page: any) => {
  await page.waitForFunction(() => typeof (window as any).__renderReadback__ === 'function');
};

const readPixelGridMax = async (page: any, x: number, y: number) => {
  const offsets = [-12, 0, 12];
  let best: { r: number; g: number; b: number; a: number } | null = null;
  for (const dx of offsets) {
    for (const dy of offsets) {
      const sample = await readPixel(page, x + dx, y + dy);
      if (!sample) continue;
      if (!best) {
        best = sample;
        continue;
      }
      const bestSum = best.r + best.g + best.b;
      const sampleSum = sample.r + sample.g + sample.b;
      if (sampleSum > bestSum) {
        best = sample;
      }
    }
  }
  return best;
};

test('renders assembly tree correctly', async ({ page }) => {
  await loadTree(page, fixture);

  const treeRoot = page.locator('[data-testid="tree-root"]');
  await expect(treeRoot).toContainText('Base-1');
});

test('tree hover toggles hover state', async ({ page }) => {
  await loadTree(page, fixture);

  const base = page.locator('[data-frame-id="root"]');
  await base.hover();
  await expect(base).toHaveAttribute('data-hovered', 'true');

  await page.locator('header').hover();
  await expect(base).toHaveAttribute('data-hovered', 'false');
});

test('ctrl-click multi-selects tree items', async ({ page }) => {
  await loadTree(page, fixture);

  const base = page.locator('[data-frame-id="root"]');
  const arm = page.locator('[data-frame-id="arm"]');

  await base.click();
  await expect(base).toHaveAttribute('data-selected', 'true');
  await base.click();

  await page.keyboard.down('Control');
  await arm.click();
  await page.keyboard.up('Control');

  await expect(base).toHaveAttribute('data-selected', 'true');
  await expect(arm).toHaveAttribute('data-selected', 'true');
});

test('shift-click selects tree range', async ({ page }) => {
  await loadTree(page, fixture);

  const base = page.locator('[data-frame-id="root"]');
  const arm = page.locator('[data-frame-id="arm"]');
  const end = page.locator('[data-frame-id="end"]');

  await base.click();
  await base.click();
  await page.keyboard.down('Shift');
  await end.click();
  await page.keyboard.up('Shift');

  await expect(base).toHaveAttribute('data-selected', 'true');
  await expect(arm).toHaveAttribute('data-selected', 'true');
  await expect(end).toHaveAttribute('data-selected', 'true');
});

test('viewport hover highlights tree item', async ({ page }) => {
  test.setTimeout(300000);
  await loadTree(page, meshFixture);

  const root = page.locator('[data-frame-id="mesh-root"]');
  await expect(root).toBeVisible();
  await page.waitForTimeout(300);
  await waitForReadback(page);

  await page.locator('header').hover();
  const { x, y } = await getCanvasCenter(page);
  const base = await readPixelGridMax(page, x, y);
  await page.mouse.move(x, y);
  await expect(root).toHaveAttribute('data-hovered', 'true');

  const hovered = await readPixelGridMax(page, x, y);
  expect(base).not.toBeNull();
  expect(hovered).not.toBeNull();
  expect(hovered?.a ?? 0).toBeGreaterThan(0);
});

test('viewport click selects tree item', async ({ page }) => {
  test.setTimeout(300000);
  await loadTree(page, meshFixture);

  const root = page.locator('[data-frame-id="mesh-root"]');
  await expect(root).toBeVisible();
  await page.waitForTimeout(300);
  await waitForReadback(page);

  const { x, y } = await getCanvasCenter(page);
  await page.mouse.move(x, y);
  const base = await readPixelGridMax(page, x, y);
  await page.mouse.click(x, y);
  await page.locator('header').hover();
  await expect(root).toHaveAttribute('data-selected', 'true');
  await page.waitForTimeout(200);

  const selected = await readPixelGridMax(page, x, y);
  expect(base).not.toBeNull();
  expect(selected).not.toBeNull();
  expect(selected?.a ?? 0).toBeGreaterThan(0);
});
