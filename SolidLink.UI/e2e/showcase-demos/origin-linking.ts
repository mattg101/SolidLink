import { Page, expect } from '@playwright/test';
import { setLabel, pause, DEMO_DELAY } from './helpers';

export const demoOriginLinking = async (page: Page) => {
  await setLabel(page, '🎯 Origin Linking - Select CAD Component');
  
  // Ensure tree is expanded enough to find 'arm'
  const root = page.locator('[data-frame-id="root"]');
  const arm = page.locator('[data-frame-id="arm"]');
  
  if (await arm.count() === 0) {
    await root.click();
    await pause(page, 300);
  }
  
  // Right click 'arm' to open context menu
  await arm.click({ button: 'right' });
  await pause(page);
  
  await setLabel(page, '🎯 Origin Linking - Toggle Origin Visibility');
  const toggleBtn = page.getByRole('button', { name: 'Toggle Origin' });
  await toggleBtn.click();
  await pause(page);
  
  await setLabel(page, '🎯 Origin Linking - Origin Appears in Ref Tree');
  // Check if "Origin of Arm-1" appears in Ref Geometry Tree
  // The path construction in App.tsx is `Origin of ${frame.name}`
  const refNode = page.getByText('Origin of Arm-1');
  await expect(refNode).toBeVisible();
  
  // Highlight it in the ref tree to show it's there
  await refNode.click();
  await pause(page);
  
  await setLabel(page, '🎯 Origin Linking - Toggle Off via CAD Tree');
  // Right click 'arm' again
  await arm.click({ button: 'right' });
  await pause(page, 300);
  await toggleBtn.click();
  await pause(page);
  
  await setLabel(page, '🎯 Origin Linking - Origin Removed from Ref Tree');
  await expect(refNode).toBeHidden();
  await pause(page);
};
