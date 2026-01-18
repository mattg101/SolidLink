import { Page, expect } from '@playwright/test';
import { setLabel, pause, DEMO_DELAY } from './helpers';

export const demoHideShow = async (page: Page) => {
  // First make sure tree is expanded
  const base = page.locator('[data-frame-id="root"]');
  const arm = page.locator('[data-frame-id="arm"]');
  
  // Expand if not already
  if (await arm.count() === 0) {
    await base.click();
    await pause(page, 300);
  }
  
  await setLabel(page, '👁️ Hide/Show - Select Node to Hide');
  await arm.click();
  await pause(page);
  
  await setLabel(page, '👁️ Hide/Show - Press Shift+H to Hide');
  await page.keyboard.press('Shift+H');
  await pause(page);
  
  await setLabel(page, '👁️ Hide/Show - Node and Children Hidden');
  await pause(page);
  
  // Show hidden toggle
  await setLabel(page, '👁️ Hide/Show - Toggle "Show Hidden"');
  const showHiddenToggle = page.locator('label', { hasText: 'Show Hidden' }).locator('input');
  await showHiddenToggle.check();
  await pause(page);
  
  await setLabel(page, '👁️ Hide/Show - Hidden Nodes Visible (Dimmed)');
  await pause(page);
  
  // Click to unhide - need to expand base again since it may have collapsed
  const hiddenArm = page.locator('[data-frame-id="arm"]');
  if (await hiddenArm.count() === 0) {
    await base.click();
    await pause(page, 300);
  }
  
  await setLabel(page, '👁️ Hide/Show - Click Hidden Node to Unhide');
  await hiddenArm.click();
  await pause(page);
  
  // Unhide all button
  await setLabel(page, '👁️ Hide/Show - Use "Unhide All" Button');
  await showHiddenToggle.uncheck();
  await pause(page, 300);
  
  // Re-hide something for demo
  if (await arm.count() > 0) {
    await arm.click();
    await page.keyboard.press('Shift+H');
    await pause(page, 200);
  }
  
  const unhideAllBtn = page.locator('button', { hasText: 'Unhide All' });
  if (await unhideAllBtn.isEnabled()) {
    await unhideAllBtn.click();
    await pause(page);
  }
  
  await setLabel(page, '👁️ Hide/Show - All Nodes Restored');
  await pause(page);
};
