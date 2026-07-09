---
name: component
description: デザインシステムに新しいUIコンポーネントを追加する一気通貫コマンド。ルール定義→ギャラリー追加→検証→基準画像更新→changelog記録までを漏れなく実行する。トリガー例:「/component ボタンを追加」「モーダルコンポーネントを作って」「新しいコンポーネントを登録」。
---

# Component — コンポーネント追加の一気通貫ワークフロー

新コンポーネントの追加を、以下の手順で**すべて漏れなく**実行する。途中で終わらせない(ギャラリー追加漏れ=ビジュアル回帰検出からの漏れ、を構造的に防ぐのがこのスキルの目的)。

## 前提

- `design-architect` スキルの絶対原則(Reference First / Why の明示 / WCAG / トークン経由)に従う。
- スタイルは `dist/tokens.css` のセマンティック変数(`--color-semantic-*` 等)のみ使用。プリミティブ直接参照・生値は禁止。

## 手順

### 1. 要件確認
ユーザーの依頼から以下を特定する。不明瞭なら実装前に確認する:
- コンポーネント名 / 目的(どのユーザー課題を解くか)
- バリアント(例: primary/secondary) / 状態(hover/focus/disabled/loading/error)
- 類似コンポーネントが `design-system/components/` に既にないか(あれば拡張を提案し、新規作成しない)

### 2. ルールファイル作成
`design-system/components/<name>.md` を `components/README.md` の書式(目的Why / バリアント / 状態 / 使用トークン / 禁止事項)で作成する。

### 3. ギャラリー追加
`gallery/index.html` に新しい `<section aria-labelledby="...">` を追加し、**全バリアント×主要状態**を並べる。既存セクションのマークアップパターン(h2 + .desc + デモ)に合わせる。

### 4. 検証
```bash
npm run build:tokens && npm run check:contrast   # 新しい色ペアを使った場合はPAIRSへの追加も検討
npm run test:visual:update                        # 意図した追加なので基準画像を更新
```
- 新コンポーネントが新しい前景/背景の組み合わせを導入した場合、`scripts/check-contrast.mjs` の `PAIRS` にペアを追加する。
- 更新された基準画像を Read で目視確認し、レイアウト崩れ・両テーマでの見え方を検証する。
- `design-architect` の `references/review-checklist.md` でセルフレビューを実施する。

### 5. 記録
`design-system/changelog.md` に「なぜこのコンポーネントが必要か(意図)」を含むエントリを追記する。

## 完了条件(すべて満たすまで終了しない)

- [ ] components/<name>.md が存在する
- [ ] ギャラリーに全バリアントが表示されている(両テーマ目視済み)
- [ ] `npm run verify` が緑
- [ ] changelog に意図が記録されている
