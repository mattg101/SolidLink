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
  demoRefGeometry,
  demoViewportInteraction,
  demoPanelResizing,
  demoOriginLinking,
} from './showcase-demos';

const fixture = JSON.parse(
  readFileSync(new URL('../src/test/fixtures/showcase_assembly.json', import.meta.url), 'utf-8')
);
const refFixture = JSON.parse(
  readFileSync(new URL('../src/test/fixtures/showcase_ref_geometry.json', import.meta.url), 'utf-8')
);
const robotDefFixture = JSON.parse(
  readFileSync(new URL('../src/test/fixtures/showcase_robot_def.json', import.meta.url), 'utf-8')
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
  await page.evaluate(({ tree, refs, robot }) => {
    const bridge = (window as any).__mockBridge__;
    bridge.send('TREE_RESPONSE', tree);
    bridge.send('REF_GEOMETRY_LIST', refs);
    bridge.send('ROBOT_DEF_LOAD', robot);
  }, { tree: fixture, refs: refFixture, robot: robotDefFixture });
  
  // Wait for 3D Viewport to have meshes
  await page.waitForFunction(() => {
    const registry = (window as any).__meshRegistry__;
    return registry && Object.keys(registry).length > 0;
  });
  
  // Wait for UI to stabilize
  await page.waitForTimeout(500);
};

test.describe('Showcase', () => {
  test('all features demo', async ({ page }, testInfo) => {
    // 5 minutes max (should be much faster now with reduced delays)
    test.setTimeout(300000); 
    
    await loadPage(page);
    
    // Introduction
    await setLabel(page, '✨ SolidLink Feature Showcase');
    await pause(page, 1500);
    
    // Panel Resizing (Show off flexible layout first)
    await demoPanelResizing(page);

    // Viewport Interaction (Show off the model)
    await demoViewportInteraction(page);
    
    // Tree Navigation
    await demoTreeNavigation(page);
    
    // Tree Filter
    await demoTreeFilter(page);
    
    // Hide/Show
    await demoHideShow(page);
    
    // Ref Geometry
    await demoRefGeometry(page);

    // Origin Linking (New Feature)
    await demoOriginLinking(page);
    
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
