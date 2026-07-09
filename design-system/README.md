# Design System

このディレクトリは `design-architect` スキル(`.claude/skills/design-architect/`)が参照・更新する唯一の情報源(Single Source of Truth)です。

## 構造

```
design-system/
├── tokens/        # W3C DTCG形式のデザイントークン ($value / $type)
│   ├── colors.json      # プリミティブ層 + セマンティック層
│   ├── typography.json  # フォント・型スケール・行間
│   ├── spacing.json     # 余白スケール・コンテナ・ブレークポイント
│   └── effects.json     # radius / shadow / motion
├── themes/        # テーマ別オーバーライド(dark.json 等)
├── components/    # コンポーネント別の設計ルール(1コンポーネント=1ファイル)
├── guidelines/    # デザイン原則・トンマナ
├── changelog.md   # 全変更の履歴(意図の記載必須)
└── archive/       # 廃止スタイルの保管庫(削除ではなく移動)
```

## ツールチェーン

| コマンド | 役割 |
|---|---|
| `npm run build:tokens` | トークンJSON → `dist/tokens.css`(:root) / `dist/tokens.dark.css`([data-theme="dark"]) を生成。**dist/ は手編集禁止** |
| `npm run check:contrast` | semantic色ペアの WCAG 2.2 コントラスト検証(ライト・ダーク両テーマ、不合格で exit 1) |
| `npm run test:visual` | `gallery/index.html` のスクリーンショット比較(両テーマ)。基準画像は環境依存のため、環境が変わったら `npm run test:visual:update` で再生成し目視確認の上コミット |
| `npm run verify` | 上記すべてを一括実行 |

## 運用ルール

1. **トークン経由の原則**: 実装コードはセマンティックトークン(`color.text.primary` 等)のみを参照する。プリミティブ(`color.gray.900`)を直接使わない。
2. **変更は必ず changelog へ**: 何を変えたかだけでなく「なぜ(意図)」を記録する。
3. **矛盾時は人間が裁定**: 新しい抽出結果が既存ルールと矛盾した場合、AIは差分を提示し、上書きの承認を得る。
4. **現在のトークン値はブランド『凪 -nagi- カウンセリングルーム』適用済み**: 深い常磐グリーン×アイボリー×真鍮ゴールド。別ブランドへ切り替える場合は `/token-sync` を用い、差分承認のうえ置換すること。

## 実装例

`site/index.html` — このトークンのみで構築したカウンセリングLPの実装例(ライト/ダーク両対応)。`gallery/index.html` はコンポーネント単位のショーケース。いずれも `npm run test:visual` の監視対象。
