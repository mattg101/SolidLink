import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { copyFile } from 'node:fs/promises';
import {
  setLabel,
  clearLabel,
  pause,
  demoTreeNavigation,
  demoTreeFilter,
  demoHideShow,
  demoRobotDefinition,
  demoUndoRedo,
} from './showcase-demos';

const fixture = JSON.parse(
  readFileSync(new URL('../src/test/fixtures/assembly_simple.json', import.meta.url), 'utf-8')
);

const setupBridge = async (page: any) => {
  await page.addInitScript(() => {
    const listeners = new Set();
    const sent: any[] = [];
    (window as any).chrome = {
      webview: {
        addEventListener: (_type: string, handler: any) => {
          listeners.add(handler);
        },
        removeEventListener: (_type: string, handler: any) => {
          listeners.delete(handler);
        },
        postMessage: (message: any) => {
          sent.push(message);
        },
      },
    };
    (window as any).__mockBridge__ = {
      send: (type: string, payload: unknown) => {
        const message = { type, payload };
        listeners.forEach((handler: any) => handler({ data: message }));
      },
    };
    (window as any).__sentMessages__ = sent;
  });
};

const loadPage = async (page: any) => {
  await setupBridge(page);
  await page.goto('/');
  await page.evaluate((payload: any) => {
    (window as any).__mockBridge__.send('TREE_RESPONSE', payload);
  }, fixture);
  // Wait for UI to stabilize
  await page.waitForTimeout(500);
};

test.describe('Showcase', () => {
  test('all features demo', async ({ page }, testInfo) => {
    test.setTimeout(300000); // 5 minutes max
    
    await loadPage(page);
    
    // Introduction
    await setLabel(page, '✨ SolidLink Feature Showcase');
    await pause(page, 1500);
    
    // Tree Navigation
    await demoTreeNavigation(page);
    
    // Tree Filter
    await demoTreeFilter(page);
    
    // Hide/Show
    await demoHideShow(page);
    
    // Robot Definition
    await demoRobotDefinition(page);
    
    // Undo/Redo
    await demoUndoRedo(page);
    
    // Conclusion
    await setLabel(page, '✅ Showcase Complete');
    await pause(page, 1500);
    await clearLabel(page);
    
    // Copy video to known location
    const video = page.video?.();
    if (video) {
      try {
        const sourcePath = await video.path();
        if (sourcePath) {
          await copyFile(sourcePath, testInfo.outputPath('showcase.webm'));
        }
      } catch {
        // Video may not be available
      }
    }
  });
});
