/**
 * ビジュアルリグレッションテスト
 *
 * Why: トークンやコンポーネントの変更が既存の見た目を意図せず壊していないかを
 * スクリーンショット比較で検出する。ギャラリー(トークン単体の監視)と
 * 実ページ(site/ の凪カウンセリングLP)の双方を、ライト・ダーク両テーマで比較する。
 *
 * 基準画像は環境依存(フォントレンダリング・Webフォント読込差)のため、
 * 初回や環境変更時は
 *   npx playwright test --update-snapshots
 * で再生成し、差分を目視確認の上コミットする。
 */
import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const PAGES = [
  { name: 'gallery', file: 'gallery/index.html', darkByToggle: true },
  { name: 'site',    file: 'site/index.html',    darkByToggle: false },
];

for (const pg of PAGES) {
  const url = pathToFileURL(resolve(pg.file)).href;
  for (const theme of ['light', 'dark']) {
    test(`${pg.name} — ${theme} theme`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(url, { waitUntil: 'networkidle' });
      // スクロール表示アニメーションを確定状態にする
      await page.evaluate(() => document.querySelectorAll('.reveal').forEach((el) => el.classList.add('in')));
      if (theme === 'dark') {
        // サイトは data-theme を直接、ギャラリーはトグルボタンで切替
        await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
      }
      await expect(page).toHaveScreenshot(`${pg.name}-${theme}.png`, { fullPage: true });
    });
  }
}
