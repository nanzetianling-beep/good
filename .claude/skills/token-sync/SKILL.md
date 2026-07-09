---
name: token-sync
description: 外部サイトやブランドガイドラインからスタイルを抽出し、デザイントークンに同期するコマンド。URL解析→トークン抽出→既存との差分提示→承認後に反映・検証・記録まで実行する。トリガー例:「/token-sync https://example.com」「このサイトのスタイルを取り込んで」「ブランドカラーをトークンに反映」。
---

# Token Sync — スタイル抽出とトークン同期

`design-architect` の [Analyze] + [Sync] フェーズを単独実行するコマンド。**差分の承認を得るまでトークンを書き換えない。**

## 手順

### 1. [Analyze] 抽出
`design-architect` の `references/style-extraction.md` の手順に厳密に従う:
- WebFetch(必要なら Playwright)で対象を取得し、色・タイポグラフィ・余白・効果・構造を抽出。
- 生値をスケールに正規化し、近似色をマージする。
- 推定が混ざる場合(CSS取得不可等)はその旨を明記する。

### 2. [Diff] 差分提示
既存トークンとの対照表を提示する:

```markdown
| トークン | 現在値 | 抽出値 | 提案 |
|---|---|---|---|
| color.primitive.brand.600 | #3450C4 | #0F766E | 置換(プレースホルダのため) |
| font.family.sans | Inter | Poppins | 要判断: 置換 or テーマ化 |
```

- 現在値がプレースホルダ(colors.json 等の `$description` に明記)なら「置換」を推奨。
- 既に実運用されている値との衝突は、ユーザーに「置換 / テーマとして併存 / 破棄」を確認する(AskUserQuestion を使用)。

### 3. [Apply] 反映(承認後のみ)
1. `design-system/tokens/*.json` を更新(ダーク側の対応が必要なら `themes/dark.json` も)。
2. `npm run build:tokens && npm run check:contrast` を実行。
   - **コントラスト不合格が出た場合**: 抽出元サイトの色が WCAG 不合格であることを意味する。盲目的に継承せず、「ブランドの色相を保ったまま明度を調整した準拠色」を提案する(元の値は $description に出典として記録)。
3. `npm run test:visual:update` で基準画像を更新し、両テーマを Read で目視確認する。

### 4. [Record] 記録
`design-system/changelog.md` に、抽出元URL・置換したトークン・**コントラスト調整を行った場合はその理由と元値**を記録する。

## 原則

- 抽出元の再現度より WCAG 準拠を優先する(調整は必ず報告)。
- 1回の同期で色・タイポ・余白すべてを変えると差分が追えなくなる場合は、カテゴリ別のコミットに分割する。
