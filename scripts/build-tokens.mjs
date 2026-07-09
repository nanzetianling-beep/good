/**
 * デザイントークン(W3C DTCG形式) → CSSカスタムプロパティ変換
 *
 * Why: design-system/tokens/ を唯一の情報源(SSOT)とし、JSONを編集すれば
 * 実装側のCSSが自動追従する状態を作る。手動同期によるトークンと実装の乖離を防ぐ。
 *
 * 出力:
 *   dist/tokens.css      — ライトテーマ(:root)
 *   dist/tokens.dark.css — ダークテーマ([data-theme="dark"])
 */
import StyleDictionary from 'style-dictionary';

const BASE_SOURCES = ['design-system/tokens/*.json'];
const DARK_SOURCES = [...BASE_SOURCES, 'design-system/themes/dark.json'];

async function build(sources, destination, selector) {
  const sd = new StyleDictionary({
    source: sources,
    log: { verbosity: 'silent' },
    platforms: {
      css: {
        transformGroup: 'css',
        buildPath: 'dist/',
        files: [
          {
            destination,
            format: 'css/variables',
            options: { selector, outputReferences: true },
          },
        ],
      },
    },
  });
  await sd.buildAllPlatforms();
  console.log(`✓ dist/${destination} (${selector})`);
}

await build(BASE_SOURCES, 'tokens.css', ':root');
await build(DARK_SOURCES, 'tokens.dark.css', '[data-theme="dark"]');
