---
name: design-audit
description: 既存のHTML/CSS/ページ/URLをデザインシステムと照合して監査するコマンド。トークン外の生値(マジックナンバー)、WCAG違反、セマンティクス違反、パターン逸脱を検出しレポートする。トリガー例:「/design-audit このページを監査」「デザインシステムに準拠しているかチェック」「アクセシビリティ監査して」。
---

# Design Audit — デザインシステム準拠監査

対象(リポジトリ内のファイル、または外部URL)をデザインシステムと照合し、違反を重要度順にレポートする。**監査のみでコードは変更しない**(修正はレポート提示後、ユーザーの承認を得てから)。

## 手順

### 1. 対象の取得
- リポジトリ内ファイル: Read で取得。
- 外部URL: WebFetch でHTML/CSSを取得。JSレンダリング必須なら Playwright(`/opt/pw-browsers/chromium`)で実DOMと `getComputedStyle` を取得。

### 2. 検査項目(この順で網羅的に)

**A. トークン準拠**
- CSS内の生値(hexカラー、px余白、任意のfont-size等)を列挙し、`dist/tokens.css` の変数で置換可能かを対照表にする。
- プリミティブ変数(`--color-primitive-*`)の直接参照を検出(semantic層経由が原則)。
- スケール外の値(例: 空白 `13px`、`space` スケールに存在しない)を検出。

**B. アクセシビリティ(WCAG 2.2 AA)**
- `design-architect` の `references/review-checklist.md` セクションAの全項目を検査。
- 色コントラストは目視ではなく計算する(`scripts/check-contrast.mjs` の輝度計算ロジックを流用した一時スクリプトを scratchpad に作成して実行)。

**C. セマンティクス**
- `div`/`span` によるボタン・リンク・リストの代用、見出し階層の飛び、ランドマーク欠落、`label` 未関連付け。

**D. パターン逸脱**
- `design-system/components/` の禁止事項(例: primaryボタン複数配置)への違反。
- `design-system/guidelines/principles.md` の原則との不整合。

### 3. レポート形式

```markdown
# デザイン監査レポート: <対象>

## サマリー
🔴 Critical: n件(WCAG不合格・機能的問題) / 🟡 Warning: n件(トークン違反・逸脱) / 🔵 Info: n件(改善提案)

## 検出事項(重要度順)
### 🔴 [A11y] <タイトル>
- 場所: <file:line または セレクタ>
- 現状: ... / 基準: ... / 修正案: ...(使用すべきトークン名を明記)
```

### 4. 事後処理
- 監査で「システム側の不備」(必要なトークンが存在しない等)が見つかった場合は、対象コードの問題と区別して報告し、トークン追加を提案する。
- ユーザーが修正を承認したら、修正後に `npm run verify` を実行し、changelog に記録する。
