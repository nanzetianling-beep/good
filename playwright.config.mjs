import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

// リモート実行環境には Chromium が同梱されている(/opt/pw-browsers/chromium)。
// あればそれを使い、なければ通常のブラウザ解決に任せる。
const bundledChromium = '/opt/pw-browsers/chromium';

export default defineConfig({
  testDir: 'tests',
  use: {
    viewport: { width: 1280, height: 800 },
    ...(existsSync(bundledChromium)
      ? { launchOptions: { executablePath: bundledChromium } }
      : {}),
  },
  expect: {
    toHaveScreenshot: {
      // フォントレンダリングの微差(アンチエイリアス)を許容しつつ、
      // 色・レイアウトの変化は検出する閾値
      maxDiffPixelRatio: 0.005,
      animations: 'disabled',
    },
  },
});
