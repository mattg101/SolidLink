import { Page, expect } from '@playwright/test';
import { setLabel, pause, DEMO_DELAY } from './helpers';

export const demoTreeNavigation = async (page: Page) => {
  await setLabel(page, '🌳 Tree Navigation - Expand Tree');
  
  const base = page.locator('[data-frame-id="root"]');
  
  // Click to expand the tree (clicking toggles open state)
  await base.click();
  await pause(page, 400);
  
  // Now arm should be visible, click to expand it too
  const arm = page.locator('[data-frame-id="arm"]');
  await arm.click();
  await pause(page, 400);
  
  // Now end should be visible
  const end = page.locator('[data-frame-id="end"]');
  
  await setLabel(page, '🌳 Tree Navigation - Hover to Preview');
  
  // Hover over items
  await base.hover();
  await pause(page);
  
  await arm.hover();
  await pause(page);
  
  await end.hover();
  await pause(page);
  
  // Click to select (already expanded, so this just selects)
  await setLabel(page, '🌳 Tree Navigation - Click to Select');
  await base.click();
  await pause(page);
  
  // Multi-select with Ctrl
  await setLabel(page, '🌳 Tree Navigation - Ctrl+Click Multi-Select');
  await page.keyboard.down('Control');
  await arm.click();
  await pause(page);
  await end.click();
  await page.keyboard.up('Control');
  await pause(page);
  
  // Clear and do range select
  await setLabel(page, '🌳 Tree Navigation - Shift+Click Range Select');
  await base.click(); // clear and select base
  await pause(page, 300);
  await page.keyboard.down('Shift');
  await end.click();
  await page.keyboard.up('Shift');
  await pause(page);
  
  // Clear selection by clicking header
  await page.locator('header').click();
  await pause(page, 300);
};
