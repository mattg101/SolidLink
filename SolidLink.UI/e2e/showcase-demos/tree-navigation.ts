import { Page, expect } from '@playwright/test';
import { setLabel, pause, DEMO_DELAY } from './helpers';

export const demoTreeNavigation = async (page: Page) => {
  await setLabel(page, '🌳 Tree Navigation - Collapse/Expand');
  
  const base = page.locator('[data-frame-id="root"]');
  
  // Tree starts expanded. Click to collapse root.
  await base.click();
  await pause(page, 400);
  
  // Click to expand root
  await base.click();
  await pause(page, 400);
  
  // Now arm should be visible
  const arm = page.locator('[data-frame-id="arm"]');
  // Collapse arm
  await arm.click();
  await pause(page, 400);

  // Expand arm
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
  await base.click(); // Collapses
  await pause(page);
  await base.click(); // Expands back, still selected
  await pause(page);
  
  // Multi-select with Ctrl
  await setLabel(page, '🌳 Tree Navigation - Ctrl+Click Multi-Select');
  await page.keyboard.down('Control');
  // Select end first (leaf)
  await end.click();
  await pause(page);
  // Select arm (collapses, but end is already selected)
  await arm.click();
  await page.keyboard.up('Control');
  await pause(page);
  
  // Clear and do range select
  await setLabel(page, '🌳 Tree Navigation - Shift+Click Range Select');
  await base.click(); // Selects base only (single select). Collapses? 
  // Base is expanded. Click -> Collapses.
  await pause(page, 300);
  await base.click(); // Expands back.
  
  await page.keyboard.down('Shift');
  // Range select Base..Arm
  await arm.click();
  await page.keyboard.up('Shift');
  await pause(page);
  
  // Clear selection by clicking header
  await page.locator('header').click();
  await pause(page, 300);
};
