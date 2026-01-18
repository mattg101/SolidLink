import { Page, expect } from '@playwright/test';
import { setLabel, pause, DEMO_DELAY } from './helpers';

export const demoRefGeometry = async (page: Page) => {
  await setLabel(page, '📐 Ref Geometry - Tree Overview');
  
  const refRoot = page.locator('[data-testid="ref-geometry-root"]');
  await expect(refRoot).toBeVisible();
  await pause(page);
  
  await setLabel(page, '📐 Ref Geometry - Select Items');
  const origin = page.locator('[data-ref-id="ref-origin"]');
  await origin.click();
  await pause(page);
  
  const planeTop = page.locator('[data-ref-id="ref-plane-top"]');
  await planeTop.click();
  await pause(page);
  
  await setLabel(page, '📐 Ref Geometry - Show/Hide Origins');
  // Right click to show context menu
  await origin.click({ button: 'right' });
  await pause(page, 300);
  
  // Click "Show Origin" in context menu
  const showOrigin = page.locator('button', { hasText: 'Show Origin' });
  if (await showOrigin.isVisible()) {
    await showOrigin.click();
  }
  await pause(page);
  
  await setLabel(page, '📐 Ref Geometry - Hide Plane');
  await planeTop.click({ button: 'right' });
  await pause(page, 300);
  const hideBtn = page.locator('button', { hasText: 'Hide' }).first();
  if (await hideBtn.isVisible()) {
    await hideBtn.click();
  }
  await pause(page);
  
  // Toggle global origins
  await setLabel(page, '📐 Ref Geometry - Toggle Global Origins');
  const globalToggle = page.locator('label', { hasText: 'Hide Origins' }).locator('input');
  await globalToggle.uncheck();
  await pause(page);
  await globalToggle.check();
  await pause(page);
};
