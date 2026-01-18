import { Page } from '@playwright/test';
import { setLabel, pause, DEMO_DELAY } from './helpers';

export const demoViewportInteraction = async (page: Page) => {
  await setLabel(page, '🎥 Viewport - Rotate Camera');
  
  const canvas = page.locator('canvas');
  if (await canvas.count() === 0) return;
  
  const box = await canvas.boundingBox();
  if (!box) return;

  const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  
  // Rotate (Left click drag)
  await page.mouse.move(center.x, center.y);
  await page.mouse.down();
  await page.mouse.move(center.x + 100, center.y + 50, { steps: 20 });
  await page.mouse.up();
  await pause(page);
  
  await setLabel(page, '🎥 Viewport - Pan Camera (Shift+Drag)');
  await page.keyboard.down('Shift');
  await page.mouse.move(center.x, center.y);
  await page.mouse.down();
  await page.mouse.move(center.x - 50, center.y - 50, { steps: 20 });
  await page.mouse.up();
  await page.keyboard.up('Shift');
  await pause(page);
  
  await setLabel(page, '🎥 Viewport - Zoom (Scroll)');
  await canvas.hover();
  await page.mouse.wheel(0, 300); // Zoom out
  await pause(page, 500);
  await page.mouse.wheel(0, -300); // Zoom in
  await pause(page);
  
  // Select via Viewport
  await setLabel(page, '🎥 Viewport - Click to Select Mesh');
  // We try to click near center where mesh likely is
  await page.mouse.click(center.x, center.y);
  await pause(page);
};
