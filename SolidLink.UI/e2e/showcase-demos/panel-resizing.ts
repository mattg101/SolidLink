import { Page } from '@playwright/test';
import { setLabel, pause, DEMO_DELAY } from './helpers';

export const demoPanelResizing = async (page: Page) => {
  await setLabel(page, '↔️ Layout - Resize Sidebar');
  
  const sidebarHandle = page.getByTestId('resize-sidebar');
  const sidebarBox = await sidebarHandle.boundingBox();
  if (sidebarBox) {
    const startX = sidebarBox.x + sidebarBox.width / 2;
    const startY = sidebarBox.y + sidebarBox.height / 2;
    
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 150, startY, { steps: 20 });
    await pause(page, 200);
    await page.mouse.move(startX - 50, startY, { steps: 20 });
    await page.mouse.up();
  }
  await pause(page);

  await setLabel(page, '↕️ Layout - Resize Tree Panels');
  
  const treeHandle = page.getByTestId('resize-tree');
  const treeBox = await treeHandle.boundingBox();
  if (treeBox) {
    const startX = treeBox.x + treeBox.width / 2;
    const startY = treeBox.y + treeBox.height / 2;
    
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, startY - 100, { steps: 20 }); // Move up
    await pause(page, 200);
    await page.mouse.move(startX, startY + 50, { steps: 20 }); // Move down
    await page.mouse.up();
  }
  await pause(page);

  await setLabel(page, '↕️ Layout - Resize Viewport / Robot Def');
  
  const robotHandle = page.getByTestId('resize-robot');
  const robotBox = await robotHandle.boundingBox();
  if (robotBox) {
    const startX = robotBox.x + robotBox.width / 2;
    const startY = robotBox.y + robotBox.height / 2;
    
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, startY - 150, { steps: 20 }); // Move up (expand robot def)
    await pause(page, 200);
    await page.mouse.move(startX, startY + 100, { steps: 20 }); // Move down (expand viewport)
    await page.mouse.up();
  }
  await pause(page);
};
