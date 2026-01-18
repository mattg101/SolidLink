import { Page, expect } from '@playwright/test';
import { setLabel, pause, DEMO_DELAY } from './helpers';

export const demoTreeFilter = async (page: Page) => {
  // First expand the tree so filtering is more visible
  const base = page.locator('[data-frame-id="root"]');
  const arm = page.locator('[data-frame-id="arm"]');
  
  if (await arm.count() === 0) {
    await base.click();
    await pause(page, 300);
    await arm.click();
    await pause(page, 300);
  }
  
  await setLabel(page, '🔍 Tree Filter - Type to Search');
  
  const input = page.locator('input[placeholder="Filter names..."]');
  
  // Type slowly for visibility
  await input.click();
  await pause(page, 300);
  
  await input.pressSequentially('Arm', { delay: 150 });
  await pause(page);
  
  await setLabel(page, '🔍 Tree Filter - Matching Nodes Highlighted');
  await pause(page);
  
  // Clear and try another
  await input.clear();
  await pause(page, 300);
  
  await setLabel(page, '🔍 Tree Filter - Search "End"');
  await input.pressSequentially('End', { delay: 150 });
  await pause(page);
  
  // Clear filter
  await setLabel(page, '🔍 Tree Filter - Clear to Show All');
  await input.clear();
  await pause(page);
};
