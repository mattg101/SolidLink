import { Page } from '@playwright/test';

export const DEMO_DELAY = 600; // ms between actions for visibility

export const setLabel = async (page: Page, label: string) => {
  await page.evaluate((text) => {
    if (typeof (window as any).__setTestLabel__ === 'function') {
      (window as any).__setTestLabel__(text);
    }
  }, label);
  await page.waitForTimeout(300);
};

export const clearLabel = async (page: Page) => {
  await page.evaluate(() => {
    if (typeof (window as any).__setTestLabel__ === 'function') {
      (window as any).__setTestLabel__(null);
    }
  });
};

export const pause = async (page: Page, ms: number = DEMO_DELAY) => {
  await page.waitForTimeout(ms);
};
