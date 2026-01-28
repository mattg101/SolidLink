import { Page, expect } from '@playwright/test';
import { setLabel, pause } from './helpers';

export const demoRefGeometryHighlight = async (page: Page) => {
  await setLabel(page, '✨ Ref Geometry - Highlight Frame');
  const firstNode = page.locator('.robot-node-group').filter({ hasText: 'Base Node' }).first();
  await expect(firstNode).toBeVisible();
  await firstNode.click();
  await pause(page, 900);

  await setLabel(page, '✨ Ref Geometry - Highlight Joint Axis');
  const jointNode = page.locator('.robot-joint-node').first();
  await expect(jointNode).toBeVisible();
  await jointNode.click();
  await pause(page, 1200);
};
