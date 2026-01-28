import { test } from '@playwright/test';
import { copyFile } from 'node:fs/promises';

const mockMarkup = `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      :root {
        color-scheme: dark;
      }
      body {
        margin: 0;
        font-family: 'IBM Plex Sans', sans-serif;
        background: radial-gradient(circle at 20% 20%, #193046, #0a0f1e 70%);
        color: #dbe7f3;
        display: grid;
        place-items: center;
        height: 100vh;
      }
      .viewport {
        width: 860px;
        height: 480px;
        border-radius: 18px;
        background: linear-gradient(145deg, #0f1a2b, #0b1422);
        box-shadow: 0 30px 60px rgba(0,0,0,0.45);
        position: relative;
        overflow: hidden;
        border: 1px solid rgba(80,120,160,0.3);
      }
      .grid {
        position: absolute;
        inset: 0;
        background-image:
          linear-gradient(rgba(70,120,170,0.15) 1px, transparent 1px),
          linear-gradient(90deg, rgba(70,120,170,0.15) 1px, transparent 1px);
        background-size: 40px 40px;
        opacity: 0.6;
      }
      .axis-highlight {
        position: absolute;
        left: 22%;
        top: 55%;
        width: 280px;
        height: 6px;
        background: #4cc9f0;
        border-radius: 999px;
        transform-origin: left center;
        box-shadow: 0 0 20px rgba(76,201,240,0.6);
      }
      .axis-highlight::after {
        content: '';
        position: absolute;
        right: -14px;
        top: 50%;
        transform: translateY(-50%);
        border-left: 18px solid #4cc9f0;
        border-top: 8px solid transparent;
        border-bottom: 8px solid transparent;
        filter: drop-shadow(0 0 8px rgba(76,201,240,0.8));
      }
      .frame-highlight {
        position: absolute;
        right: 24%;
        top: 35%;
        width: 120px;
        height: 120px;
        border-radius: 50%;
        border: 3px solid rgba(76,201,240,0.5);
        box-shadow: 0 0 25px rgba(76,201,240,0.6);
        display: grid;
        place-items: center;
      }
      .frame-highlight::before {
        content: '';
        width: 60px;
        height: 60px;
        border-radius: 50%;
        border: 2px dashed rgba(255,255,255,0.3);
      }
      .highlight {
        animation: breathe 2.6s ease-in-out infinite;
      }
      @keyframes breathe {
        0%, 100% { transform: scale(1); opacity: 0.9; }
        50% { transform: scale(1.08); opacity: 1; }
      }
      .label {
        position: absolute;
        left: 24px;
        top: 20px;
        font-size: 14px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: rgba(219,231,243,0.8);
      }
    </style>
  </head>
  <body>
    <div class="viewport">
      <div class="grid"></div>
      <div class="label">Ref Geometry Highlight Mock</div>
      <div class="axis-highlight highlight"></div>
      <div class="frame-highlight highlight"></div>
    </div>
  </body>
</html>
`;

test('ref geometry highlight mock video', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 860, height: 480 });
  await page.setContent(mockMarkup);
  await page.waitForTimeout(4000);

  const video = page.video?.();
  if (video) {
    try {
      const sourcePath = await video.path();
      if (sourcePath) {
        await copyFile(sourcePath, testInfo.outputPath('ref-geometry-highlight-mock.webm'));
      }
    } catch {
      // ignore
    }
  }
});
