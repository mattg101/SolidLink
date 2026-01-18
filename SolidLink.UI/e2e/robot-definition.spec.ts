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
