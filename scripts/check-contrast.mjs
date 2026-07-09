/**
 * WCAG 2.2 コントラスト自動検証(依存パッケージゼロ)
 *
 * Why: コントラスト基準を「レビュー時に人が思い出す」運用ではなく、
 * トークン変更のたびに機械検証する。semanticトークンの組み合わせごとに
 * 要求水準(4.5:1 = 通常テキスト / 3:1 = 大テキスト・UI部品)を宣言し、
 * ライト・ダーク両テーマで検査する。不合格が1つでもあれば exit 1。
 *
 * 使い方: node scripts/check-contrast.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const TOKENS_DIR = 'design-system/tokens';
const DARK_THEME = 'design-system/themes/dark.json';

// 検証ペア: fg(前景) を bg(背景) に載せたときの最低コントラスト比
const PAIRS = [
  { fg: 'color.semantic.text.primary',      bg: 'color.semantic.background.default', min: 4.5, use: '本文テキスト' },
  { fg: 'color.semantic.text.primary',      bg: 'color.semantic.background.subtle',  min: 4.5, use: 'サブ背景上の本文' },
  { fg: 'color.semantic.text.secondary',    bg: 'color.semantic.background.default', min: 4.5, use: '補助テキスト' },
  { fg: 'color.semantic.text.muted',        bg: 'color.semantic.background.default', min: 3.0, use: '大テキスト限定(18px+)' },
  { fg: 'color.semantic.text.inverse',      bg: 'color.semantic.action.primary',     min: 4.5, use: 'ボタンラベル' },
  { fg: 'color.semantic.feedback.success',  bg: 'color.semantic.background.default', min: 3.0, use: 'UI部品・アイコン' },
  { fg: 'color.semantic.feedback.warning',  bg: 'color.semantic.background.default', min: 3.0, use: 'UI部品・アイコン' },
  { fg: 'color.semantic.feedback.danger',   bg: 'color.semantic.background.default', min: 3.0, use: 'UI部品・アイコン' },
];

// ---- トークン読み込み・参照解決 --------------------------------------------

function deepMerge(base, override) {
  const out = { ...base };
  for (const [k, v] of Object.entries(override)) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && typeof base[k] === 'object'
      ? deepMerge(base[k], v)
      : v;
  }
  return out;
}

function loadTokens(withDark) {
  let tree = {};
  for (const f of readdirSync(TOKENS_DIR).filter((f) => f.endsWith('.json'))) {
    tree = deepMerge(tree, JSON.parse(readFileSync(join(TOKENS_DIR, f), 'utf8')));
  }
  if (withDark) tree = deepMerge(tree, JSON.parse(readFileSync(DARK_THEME, 'utf8')));
  return tree;
}

function getPath(tree, path) {
  return path.split('.').reduce((node, key) => node?.[key], tree);
}

function resolveValue(tree, path, depth = 0) {
  if (depth > 10) throw new Error(`循環参照の疑い: ${path}`);
  const node = getPath(tree, path);
  if (!node || node.$value === undefined) throw new Error(`トークンが見つからない: ${path}`);
  const v = node.$value;
  const ref = typeof v === 'string' && v.match(/^\{(.+)\}$/);
  return ref ? resolveValue(tree, ref[1], depth + 1) : v;
}

// ---- WCAG 相対輝度・コントラスト比 ------------------------------------------

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
}

function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((c) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(fgHex, bgHex) {
  const [l1, l2] = [luminance(fgHex), luminance(bgHex)].sort((a, b) => b - a);
  return (l1 + 0.05) / (l2 + 0.05);
}

// ---- 実行 -------------------------------------------------------------------

let failures = 0;
for (const theme of ['light', 'dark']) {
  const tree = loadTokens(theme === 'dark');
  console.log(`\n■ ${theme} テーマ`);
  for (const { fg, bg, min, use } of PAIRS) {
    const fgHex = resolveValue(tree, fg);
    const bgHex = resolveValue(tree, bg);
    const ratio = contrast(fgHex, bgHex);
    const pass = ratio >= min;
    if (!pass) failures++;
    const mark = pass ? '✓' : '✗';
    console.log(
      `  ${mark} ${ratio.toFixed(2).padStart(5)}:1 (要 ${min}:1) ${fg.replace('color.semantic.', '')} on ${bg.replace('color.semantic.', '')} — ${use} [${fgHex} / ${bgHex}]`
    );
  }
}

if (failures > 0) {
  console.error(`\n✗ ${failures} 件のコントラスト不合格。トークンを修正し changelog に記録すること。`);
  process.exit(1);
}
console.log('\n✓ 全ペア合格 (WCAG 2.2)');
