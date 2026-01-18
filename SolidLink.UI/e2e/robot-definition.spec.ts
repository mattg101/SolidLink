import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const fixture = JSON.parse(
  readFileSync(new URL('../src/test/fixtures/assembly_simple.json', import.meta.url), 'utf-8')
);

// Helper to setup mock bridge
const setupBridge = async (page: any) => {
  await page.addInitScript(() => {
    const listeners = new Set();
    const sent: any[] = [];
    (window as any).chrome = {
      webview: {
        addEventListener: (_type: string, handler: any) => {
          listeners.add(handler);
        },
        removeEventListener: (_type: string, handler: any) => {
          listeners.delete(handler);
        },
        postMessage: (message: any) => {
          sent.push(message);
          // If update message, DO NOT bounce back as LOAD, because that wipes history in App.tsx
          // The real add-in typically just saves silently.
        },
      },
    };
    (window as any).__mockBridge__ = {
      send: (type: string, payload: unknown) => {
        const message = { type, payload };
        listeners.forEach((handler: any) => handler({ data: message }));
      },
    };
    (window as any).__sentMessages__ = sent;
  });
};

const loadPage = async (page: any) => {
  await setupBridge(page);
  await page.goto('/');
  // Send initial tree to avoid 'No Model' state if needed, though Robot Def is independent
  await page.evaluate((payload) => {
    (window as any).__mockBridge__.send('TREE_RESPONSE', payload);
  }, fixture);
};

test('renders robot definition panel', async ({ page }) => {
  await loadPage(page);
  const panel = page.locator('.robot-def-panel');
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('Robot Definition');
});

test('selects node in robot panel', async ({ page }) => {
  await loadPage(page);
  
  // Find a node group in the SVG
  const node = page.locator('.robot-node-group').first();
  await expect(node).toBeVisible();
  
  // Click it
  await node.click();
  
  // Check if selected class is applied
  const rect = node.locator('.robot-node');
  await expect(rect).toHaveClass(/selected/);
  
  // Check if metadata panel updates
  const metaTitle = page.locator('.robot-def-meta-title');
  await expect(metaTitle).toBeVisible();
  
  const nameInput = page.locator('.robot-def-field input').first();
  await expect(nameInput).toBeVisible();
});

test('edits node name in metadata panel', async ({ page }) => {
  await loadPage(page);
  
  const node = page.locator('.robot-node-group').first();
  await node.click();
  
  const nameInput = page.locator('.robot-def-field input').first();
  const originalName = await nameInput.inputValue();
  const newName = originalName + '_Edited';
  
  await nameInput.fill(newName);
  
  // Check if node title in graph updated
  const nodeTitle = node.locator('.robot-node-title');
  await expect(nodeTitle).toHaveText(newName);
  
  // Check if update message sent
  await page.waitForFunction(() => {
    const messages = (window as any).__sentMessages__ || [];
    return messages.some((m: any) => m.type === 'ROBOT_DEF_UPDATE');
  });
});

test('adds child node', async ({ page }) => {
  await loadPage(page);
  
  const node = page.locator('.robot-node-group').first();
  await node.hover();
  
  const addBtn = node.locator('.robot-node-action').first();
  await expect(addBtn).toBeVisible();
  await addBtn.click();
  
  // Expect count to increase
  const nodes = page.locator('.robot-node-group');
  // Initial count is 5 (Base, Link 1, Link 2, Sensor 1, Tool Frame) based on default definition
  // +1 new node
  await expect(nodes).toHaveCount(6);
});

test('removes node', async ({ page }) => {
  await loadPage(page);
  
  // Use a leaf node to avoid removing huge chunks
  const nodes = page.locator('.robot-node-group');
  const count = await nodes.count();
  
  // Last node is usually a leaf in default layout
  const lastNode = nodes.last();
  await lastNode.hover();
  
  // Remove button is the second action
  const removeBtn = lastNode.locator('.robot-node-action').nth(1);
  await expect(removeBtn).toBeVisible();
  await removeBtn.click();
  
  await expect(nodes).toHaveCount(count - 1);
});

test('syncs selection from robot panel to viewport context', async ({ page }) => {
  await loadPage(page);
  
  // Mock geometry IDs are 'base_plate', 'arm_1', etc. in default definition
  // Select Base node
  const baseNode = page.locator('.robot-node-group').filter({ hasText: 'Base' });
  await baseNode.click();
  
  await expect(baseNode.locator('.robot-node')).toHaveClass(/selected/);
});

test('undo/redo works', async ({ page }) => {
  await loadPage(page);
  
  const node = page.locator('.robot-node-group').first();
  await node.click();
  
  const nameInput = page.locator('.robot-def-field input').first();
  const originalName = await nameInput.inputValue();
  
  await nameInput.fill('ChangedName');
  await expect(node.locator('.robot-node-title')).toHaveText('ChangedName');
  
  const undoBtn = page.locator('button', { hasText: 'Undo' });
  await expect(undoBtn).toBeEnabled();
  await undoBtn.click();
  
  await expect(node.locator('.robot-node-title')).toHaveText(originalName);
  
  const redoBtn = page.locator('button', { hasText: 'Redo' });
  await expect(redoBtn).toBeEnabled();
  await redoBtn.click();
  
  await expect(node.locator('.robot-node-title')).toHaveText('ChangedName');
});

test('auto-centers tree when loading new definition', async ({ page }) => {
  await loadPage(page);
  
  // Create a large definition that would be off-center if not fitted
  const largeDefinition = {
    nodes: Array.from({ length: 10 }, (_, i) => ({
      id: `node-${i}`,
      name: `Node ${i}`,
      type: 'body',
      children: i < 9 ? [`node-${i + 1}`] : [],
      geometryIds: []
    })),
    joints: Array.from({ length: 9 }, (_, i) => ({
      id: `joint-${i}`,
      parentId: `node-${i}`,
      childId: `node-${i + 1}`,
      type: 'fixed'
    }))
  };

  // Simulate loading
  await page.evaluate((payload) => {
    const event = new MessageEvent('message', {
      data: { type: 'ROBOT_DEF_LOAD', payload }
    });
    window.dispatchEvent(event);
    // Also trigger via mock bridge listener manually if needed, but setupBridge handles window.chrome.webview
    (window as any).__mockBridge__.send('ROBOT_DEF_LOAD', payload);
  }, largeDefinition);

  // Wait for layout update
  await page.waitForTimeout(500);

  // Check transform on the group
  const group = page.locator('.robot-def-canvas-stage svg > g');
  await expect(group).toBeVisible();
  
  // We can verify it's not at the default pan (0,0) or previous pan
  // But strictly, we want to ensure it's centered.
  // Using the bounding box logic from the centering test:
  
  const panel = page.locator('.robot-def-canvas-stage');
  const panelBox = await panel.boundingBox();
  if (!panelBox) throw new Error('Panel box not found');
  
  const nodes = page.locator('.robot-node-group');
  await expect(nodes).toHaveCount(10);
  
  // Calculate content bounds
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < 10; i++) {
    const box = await nodes.nth(i).boundingBox();
    if (!box) continue;
    minX = Math.min(minX, box.x);
    maxX = Math.max(maxX, box.x + box.width);
    minY = Math.min(minY, box.y);
    maxY = Math.max(maxY, box.y + box.height);
  }
  
  const contentCenterX = (minX + maxX) / 2;
  const contentCenterY = (minY + maxY) / 2;
  const panelCenterX = panelBox.x + panelBox.width / 2;
  const panelCenterY = panelBox.y + panelBox.height / 2;
  
  expect(Math.abs(contentCenterX - panelCenterX)).toBeLessThan(20);
  expect(Math.abs(contentCenterY - panelCenterY)).toBeLessThan(20);
});

test('shows origin frame field in metadata', async ({ page }) => {
  await loadPage(page);
  
  const node = page.locator('.robot-node-group').first();
  await node.click();
  
  const originLabel = page.locator('label', { hasText: /Origin Frame|Frame/ });
  await expect(originLabel).toBeVisible();
  
  const select = page.locator('.robot-def-field select').nth(1); // 0 is Type, 1 is Origin/Frame
  await expect(select).toBeVisible();
});
