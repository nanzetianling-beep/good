/**
 * ビジュアルリグレッションテスト
 *
 * Why: トークンやコンポーネントの変更が既存の見た目を意図せず壊していないかを
 * スクリーンショット比較で検出する。ギャラリーページが全コンポーネント・
 * 全テーマを網羅しているため、これ1ページの比較でシステム全体を監視できる。
 *
 * 基準画像は環境依存(フォントレンダリング差)のため、初回や環境変更時は
 *   npx playwright test --update-snapshots
 * で再生成し、差分を目視確認の上コミットする。
 */
import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const galleryUrl = pathToFileURL(resolve('gallery/index.html')).href;

for (const theme of ['light', 'dark']) {
  test(`gallery — ${theme} theme`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(galleryUrl);
    if (theme === 'dark') {
      await page.getByRole('button', { name: 'ダークテーマ' }).click();
    }
    await expect(page).toHaveScreenshot(`gallery-${theme}.png`, { fullPage: true });
  });
}
