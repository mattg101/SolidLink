import { Page, expect } from '@playwright/test';
import { setLabel, pause, DEMO_DELAY } from './helpers';

export const demoRobotDefinition = async (page: Page) => {
  await setLabel(page, '🤖 Robot Definition - Panel Overview');
  
  const panel = page.locator('.robot-def-panel');
  await expect(panel).toBeVisible();
  await pause(page);
  
  // Select a node
  await setLabel(page, '🤖 Robot Definition - Select Node');
  const node = page.locator('.robot-node-group').first();
  await node.click();
  await pause(page);
  
  // Show metadata panel
  await setLabel(page, '🤖 Robot Definition - Metadata Panel');
  await pause(page);
  
  // Edit name
  await setLabel(page, '🤖 Robot Definition - Edit Node Name');
  const nameInput = page.locator('.robot-def-field input').first();
  const originalName = await nameInput.inputValue();
  await nameInput.clear();
  await nameInput.pressSequentially('Demo_Link', { delay: 100 });
  await pause(page);
  
  // Add child node
  await setLabel(page, '🤖 Robot Definition - Add Child Node');
  await node.hover();
  await pause(page, 300);
  const addBtn = node.locator('.robot-node-action').first();
  await addBtn.click();
  await pause(page);
  
  // Restore name
  await node.click();
  await pause(page, 200);
  await nameInput.clear();
  await nameInput.fill(originalName);
  await pause(page, 300);
};

export const demoUndoRedo = async (page: Page) => {
  await setLabel(page, '↩️ Undo/Redo - Make a Change');
  
  const node = page.locator('.robot-node-group').first();
  await node.click();
  await pause(page, 300);
  
  const nameInput = page.locator('.robot-def-field input').first();
  const originalName = await nameInput.inputValue();
  
  await nameInput.clear();
  await nameInput.pressSequentially('Changed', { delay: 80 });
  await pause(page);
  
  await setLabel(page, '↩️ Undo/Redo - Click Undo');
  const undoBtn = page.locator('button', { hasText: 'Undo' });
  await undoBtn.click();
  await pause(page);
  
  await setLabel(page, '↩️ Undo/Redo - Change Reverted');
  await pause(page);
  
  await setLabel(page, '↩️ Undo/Redo - Click Redo');
  const redoBtn = page.locator('button', { hasText: 'Redo' });
  await redoBtn.click();
  await pause(page);
  
  await setLabel(page, '↩️ Undo/Redo - Change Restored');
  await pause(page);
  
  // Restore original
  await undoBtn.click();
  await pause(page, 200);
};
